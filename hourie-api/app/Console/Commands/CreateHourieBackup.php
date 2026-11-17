<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

class CreateHourieBackup extends Command
{
    protected $signature = 'hourie:backup';

    protected $description = 'Back up the Hourie database and uploaded files to the configured backup destination';

    /** @var resource|null */
    private $lockHandle;

    public function handle(): int
    {
        if (! $this->acquireLock()) {
            $this->warn('Une sauvegarde Hourie est déjà en cours.');

            return self::SUCCESS;
        }

        $partialDirectory = null;

        try {
            $destinationPath = rtrim((string) config('hourie-backup.root'), '\\/');
            $this->validateDestination($destinationPath);

            $backupRoot = $destinationPath.DIRECTORY_SEPARATOR.trim((string) config('hourie-backup.directory'), '\\/');
            File::ensureDirectoryExists($backupRoot);

            $timestamp = now()->format('Y-m-d_H-i-s');
            $partialDirectory = $backupRoot.DIRECTORY_SEPARATOR.'.partial-'.$timestamp.'-'.getmypid();
            $finalDirectory = $backupRoot.DIRECTORY_SEPARATOR.$timestamp;
            File::ensureDirectoryExists($partialDirectory);

            $this->info('Export de la base de données…');
            $databaseArchive = $this->dumpDatabase($partialDirectory);

            $this->info('Archivage des documents importés…');
            $filesArchive = $this->archiveUploads($partialDirectory);

            $this->verifyZipArchive($databaseArchive, 'database.sql');
            $this->verifyZipArchive($filesArchive);

            $checksums = [
                basename($databaseArchive) => hash_file('sha256', $databaseArchive),
                basename($filesArchive) => hash_file('sha256', $filesArchive),
            ];
            File::put(
                $partialDirectory.'/checksums.txt',
                collect($checksums)->map(fn (string $hash, string $file) => $hash.'  '.$file)->implode(PHP_EOL).PHP_EOL,
            );
            File::put($partialDirectory.'/backup-info.json', json_encode([
                'created_at' => now()->toIso8601String(),
                'application' => (string) config('app.name'),
                'database' => (string) config('database.connections.mysql.database'),
                'destination' => $destinationPath,
                'volume_uuid' => (string) config('hourie-backup.volume_uuid'),
                'verified' => true,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);

            if (! @rename($partialDirectory, $finalDirectory)) {
                throw new RuntimeException('Impossible de finaliser le dossier de sauvegarde.');
            }
            $partialDirectory = null;

            $this->pruneOldBackups($backupRoot);

            $size = collect(File::files($finalDirectory))->sum(fn (\SplFileInfo $file) => $file->getSize());
            $this->info('Sauvegarde vérifiée : '.$finalDirectory.' ('.$this->formatBytes($size).')');
            Log::info('Hourie backup completed.', ['path' => $finalDirectory, 'bytes' => $size]);

            return self::SUCCESS;
        } catch (Throwable $exception) {
            if ($partialDirectory && File::isDirectory($partialDirectory)) {
                File::deleteDirectory($partialDirectory);
            }

            $this->error('Échec de la sauvegarde : '.$exception->getMessage());
            Log::error('Hourie backup failed.', ['error' => $exception->getMessage()]);

            return self::FAILURE;
        } finally {
            $this->releaseLock();
        }
    }

    private function validateDestination(string $destinationPath): void
    {
        if ($destinationPath === '' || ! File::isDirectory($destinationPath)) {
            throw new RuntimeException('La destination de sauvegarde configurée n’est pas disponible.');
        }

        $expectedUuid = strtoupper(trim((string) config('hourie-backup.volume_uuid')));
        if ($expectedUuid !== '') {
            $this->validateMacVolume($destinationPath, $expectedUuid);
        }

        if (! is_writable($destinationPath)) {
            throw new RuntimeException('La destination de sauvegarde est en lecture seule.');
        }

        $freeBytes = disk_free_space($destinationPath);
        if ($freeBytes === false || $freeBytes < (int) config('hourie-backup.minimum_free_bytes')) {
            throw new RuntimeException('La destination de sauvegarde ne dispose pas d’assez d’espace libre.');
        }
    }

    private function validateMacVolume(string $destinationPath, string $expectedUuid): void
    {
        if (PHP_OS_FAMILY !== 'Darwin') {
            throw new RuntimeException('BACKUP_VOLUME_UUID est uniquement pris en charge sur macOS.');
        }

        $diskutil = (string) config('hourie-backup.diskutil_binary');
        $this->requireExecutable($diskutil);
        $process = new Process([$diskutil, 'info', $destinationPath]);
        $process->setTimeout(30)->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('Le chemin configuré n’est pas un volume USB monté.');
        }

        $info = $process->getOutput();
        preg_match('/Volume UUID:\s+([A-Fa-f0-9-]+)/', $info, $uuidMatch);
        preg_match('/Device Location:\s+(.+)/', $info, $locationMatch);
        preg_match('/Volume Read-Only:\s+(.+)/', $info, $readOnlyMatch);

        $actualUuid = strtoupper(trim($uuidMatch[1] ?? ''));
        if ($actualUuid !== $expectedUuid) {
            throw new RuntimeException('La clé connectée ne correspond pas à la clé de sauvegarde autorisée.');
        }
        if (strtolower(trim($locationMatch[1] ?? '')) !== 'external') {
            throw new RuntimeException('Le volume configuré n’est pas un support externe.');
        }
        if (strtolower(trim($readOnlyMatch[1] ?? '')) !== 'no') {
            throw new RuntimeException('La clé USB est en lecture seule.');
        }
    }

    private function dumpDatabase(string $directory): string
    {
        $binary = (string) config('hourie-backup.mysqldump_binary');
        $this->requireExecutable($binary);

        $connection = config('database.connections.mysql');
        if (! is_array($connection) || empty($connection['database'])) {
            throw new RuntimeException('La connexion MySQL de sauvegarde est invalide.');
        }

        $credentialsDirectory = storage_path('app/private/hourie-backup');
        File::ensureDirectoryExists($credentialsDirectory);
        $credentialsPath = $credentialsDirectory.'/mysql-'.bin2hex(random_bytes(8)).'.cnf';
        $sqlPath = $directory.'/database.sql';
        $archivePath = $directory.'/database.zip';

        try {
            File::put($credentialsPath, implode(PHP_EOL, [
                '[client]',
                'host='.$this->quoteOptionValue((string) ($connection['host'] ?? '127.0.0.1')),
                'port='.(int) ($connection['port'] ?? 3306),
                'user='.$this->quoteOptionValue((string) ($connection['username'] ?? '')),
                'password='.$this->quoteOptionValue((string) ($connection['password'] ?? '')),
                '',
            ]));
            chmod($credentialsPath, 0600);

            $this->runProcess([
                $binary,
                '--defaults-extra-file='.$credentialsPath,
                '--single-transaction',
                '--quick',
                '--routines',
                '--triggers',
                '--events',
                '--hex-blob',
                '--default-character-set=utf8mb4',
                '--result-file='.$sqlPath,
                (string) $connection['database'],
            ], 3600);

            if (! File::exists($sqlPath) || File::size($sqlPath) === 0) {
                throw new RuntimeException('Le fichier SQL généré est vide.');
            }

            $this->createZipArchive($archivePath, ['database.sql' => $sqlPath]);
        } finally {
            File::delete($credentialsPath);
            File::delete($sqlPath);
        }

        return $archivePath;
    }

    private function archiveUploads(string $directory): string
    {
        $archivePath = $directory.'/uploaded-files.zip';
        $uploadDirectories = [
            'private' => storage_path('app/private'),
            'equipment-images' => (string) config('filesystems.disks.equipment-images.root'),
            'equipment-documents' => (string) config('filesystems.disks.equipment-documents.root'),
        ];

        $this->createZipArchiveFromDirectories($archivePath, $uploadDirectories);

        if (! File::exists($archivePath) || File::size($archivePath) === 0) {
            throw new RuntimeException('L’archive des documents est vide.');
        }

        return $archivePath;
    }

    private function verifyZipArchive(string $path, ?string $requiredEntry = null): void
    {
        if (! File::exists($path) || File::size($path) === 0) {
            throw new RuntimeException('Un fichier de sauvegarde attendu est absent.');
        }

        $archive = new ZipArchive;
        if ($archive->open($path, ZipArchive::CHECKCONS) !== true) {
            throw new RuntimeException('Une archive de sauvegarde est corrompue.');
        }

        try {
            if ($requiredEntry !== null && $archive->locateName($requiredEntry) === false) {
                throw new RuntimeException('Une archive de sauvegarde est incomplète.');
            }
        } finally {
            $archive->close();
        }
    }

    /** @param array<string, string> $files */
    private function createZipArchive(string $archivePath, array $files): void
    {
        $archive = new ZipArchive;
        if ($archive->open($archivePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Impossible de créer l’archive de sauvegarde.');
        }

        try {
            foreach ($files as $archiveName => $sourcePath) {
                if (! $archive->addFile($sourcePath, $archiveName)) {
                    throw new RuntimeException('Impossible d’ajouter un fichier à l’archive de sauvegarde.');
                }
            }
        } finally {
            $archive->close();
        }
    }

    /** @param array<string, string> $directories */
    private function createZipArchiveFromDirectories(string $archivePath, array $directories): void
    {
        $archive = new ZipArchive;
        if ($archive->open($archivePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Impossible de créer l’archive des documents.');
        }

        try {
            foreach ($directories as $prefix => $directory) {
                if (! File::isDirectory($directory)) {
                    continue;
                }

                $files = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
                );

                foreach ($files as $file) {
                    if (! $file->isFile()) {
                        continue;
                    }

                    $relativePath = substr($file->getPathname(), strlen($directory) + 1);
                    $archiveName = $prefix.'/'.str_replace(DIRECTORY_SEPARATOR, '/', $relativePath);
                    if (! $archive->addFile($file->getPathname(), $archiveName)) {
                        throw new RuntimeException('Impossible d’ajouter un document à l’archive.');
                    }
                }
            }

            if ($archive->numFiles === 0) {
                $archive->addFromString('README.txt', 'No uploaded files existed when this backup was created.');
            }
        } finally {
            $archive->close();
        }
    }

    private function pruneOldBackups(string $backupRoot): void
    {
        $retentionCount = max(1, (int) config('hourie-backup.retention_count'));
        $directories = collect(File::directories($backupRoot))
            ->filter(fn (string $path) => preg_match('/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/', basename($path)) === 1)
            ->sortDesc()
            ->values();

        $directories->slice($retentionCount)->each(fn (string $path) => File::deleteDirectory($path));
    }

    /** @param array<int, string> $command */
    private function runProcess(array $command, int $timeout): void
    {
        $process = new Process($command, base_path());
        $process->setTimeout($timeout)->run();

        if (! $process->isSuccessful()) {
            $message = trim($process->getErrorOutput()) ?: trim($process->getOutput());
            throw new RuntimeException($message !== '' ? $message : 'Une commande de sauvegarde a échoué.');
        }
    }

    private function requireExecutable(string $path): void
    {
        $isAvailable = str_contains($path, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1
            ? File::isFile($path)
            : true;

        if ($path === '' || ! $isAvailable) {
            throw new RuntimeException('Programme de sauvegarde introuvable : '.$path);
        }
    }

    private function quoteOptionValue(string $value): string
    {
        return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
    }

    private function acquireLock(): bool
    {
        $lockPath = storage_path('app/private/hourie-backup.lock');
        File::ensureDirectoryExists(dirname($lockPath));
        $this->lockHandle = fopen($lockPath, 'c');

        return is_resource($this->lockHandle) && flock($this->lockHandle, LOCK_EX | LOCK_NB);
    }

    private function releaseLock(): void
    {
        if (! is_resource($this->lockHandle)) {
            return;
        }

        flock($this->lockHandle, LOCK_UN);
        fclose($this->lockHandle);
        $this->lockHandle = null;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024 * 1024) {
            return number_format($bytes / 1024, 1, ',', ' ').' Ko';
        }

        return number_format($bytes / (1024 * 1024), 1, ',', ' ').' Mo';
    }
}
