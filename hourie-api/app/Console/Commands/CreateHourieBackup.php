<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

class CreateHourieBackup extends Command
{
    protected $signature = 'hourie:backup';

    protected $description = 'Back up the Hourie database and uploaded files to the configured USB drive';

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
            $usbPath = rtrim((string) config('hourie-backup.usb_path'), DIRECTORY_SEPARATOR);
            $this->validateUsb($usbPath);

            $backupRoot = $usbPath.DIRECTORY_SEPARATOR.trim((string) config('hourie-backup.directory'), DIRECTORY_SEPARATOR);
            File::ensureDirectoryExists($backupRoot);

            $timestamp = now()->format('Y-m-d_H-i-s');
            $partialDirectory = $backupRoot.DIRECTORY_SEPARATOR.'.partial-'.$timestamp.'-'.getmypid();
            $finalDirectory = $backupRoot.DIRECTORY_SEPARATOR.$timestamp;
            File::ensureDirectoryExists($partialDirectory);

            $this->info('Export de la base de données…');
            $databaseArchive = $this->dumpDatabase($partialDirectory);

            $this->info('Archivage des documents importés…');
            $filesArchive = $this->archiveUploads($partialDirectory);

            $this->verifyArchive($databaseArchive, (string) config('hourie-backup.gzip_binary'), ['-t', $databaseArchive]);
            $this->verifyArchive($filesArchive, (string) config('hourie-backup.tar_binary'), ['-tzf', $filesArchive]);

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
                'usb_uuid' => (string) config('hourie-backup.usb_uuid'),
                'verified' => true,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL);

            if (! @rename($partialDirectory, $finalDirectory)) {
                throw new RuntimeException('Impossible de finaliser le dossier de sauvegarde.');
            }
            $partialDirectory = null;

            $this->pruneOldBackups($backupRoot);

            $size = collect(File::files($finalDirectory))->sum(fn (\SplFileInfo $file) => $file->getSize());
            $this->info('Sauvegarde vérifiée : '.$finalDirectory.' ('.$this->formatBytes($size).')');
            Log::info('Hourie USB backup completed.', ['path' => $finalDirectory, 'bytes' => $size]);

            return self::SUCCESS;
        } catch (Throwable $exception) {
            if ($partialDirectory && File::isDirectory($partialDirectory)) {
                File::deleteDirectory($partialDirectory);
            }

            $this->error('Échec de la sauvegarde : '.$exception->getMessage());
            Log::error('Hourie USB backup failed.', ['error' => $exception->getMessage()]);

            return self::FAILURE;
        } finally {
            $this->releaseLock();
        }
    }

    private function validateUsb(string $usbPath): void
    {
        if ($usbPath === '' || ! File::isDirectory($usbPath)) {
            throw new RuntimeException('La clé USB configurée n’est pas connectée.');
        }

        $expectedUuid = strtoupper(trim((string) config('hourie-backup.usb_uuid')));
        if ($expectedUuid === '') {
            throw new RuntimeException('BACKUP_USB_UUID doit être configuré.');
        }

        $diskutil = (string) config('hourie-backup.diskutil_binary');
        $this->requireExecutable($diskutil);
        $process = new Process([$diskutil, 'info', $usbPath]);
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
        if (strtolower(trim($readOnlyMatch[1] ?? '')) !== 'no' || ! is_writable($usbPath)) {
            throw new RuntimeException('La clé USB est en lecture seule.');
        }

        $freeBytes = disk_free_space($usbPath);
        if ($freeBytes === false || $freeBytes < (int) config('hourie-backup.minimum_free_bytes')) {
            throw new RuntimeException('La clé USB ne dispose pas d’assez d’espace libre.');
        }
    }

    private function dumpDatabase(string $directory): string
    {
        $binary = (string) config('hourie-backup.mysqldump_binary');
        $gzip = (string) config('hourie-backup.gzip_binary');
        $this->requireExecutable($binary);
        $this->requireExecutable($gzip);

        $connection = config('database.connections.mysql');
        if (! is_array($connection) || empty($connection['database'])) {
            throw new RuntimeException('La connexion MySQL de sauvegarde est invalide.');
        }

        $credentialsDirectory = storage_path('app/private/hourie-backup');
        File::ensureDirectoryExists($credentialsDirectory);
        $credentialsPath = $credentialsDirectory.'/mysql-'.bin2hex(random_bytes(8)).'.cnf';
        $sqlPath = $directory.'/database.sql';
        $archivePath = $sqlPath.'.gz';

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

            $this->runProcess([$gzip, '-9', $sqlPath], 3600);
        } finally {
            File::delete($credentialsPath);
        }

        return $archivePath;
    }

    private function archiveUploads(string $directory): string
    {
        $binary = (string) config('hourie-backup.tar_binary');
        $this->requireExecutable($binary);
        $archivePath = $directory.'/uploaded-files.tar.gz';

        $this->runProcess([
            $binary,
            '-czf',
            $archivePath,
            '-C',
            storage_path(),
            'app',
        ], 3600);

        if (! File::exists($archivePath) || File::size($archivePath) === 0) {
            throw new RuntimeException('L’archive des documents est vide.');
        }

        return $archivePath;
    }

    /** @param array<int, string> $arguments */
    private function verifyArchive(string $path, string $binary, array $arguments): void
    {
        if (! File::exists($path) || File::size($path) === 0) {
            throw new RuntimeException('Un fichier de sauvegarde attendu est absent.');
        }

        $this->runProcess([$binary, ...$arguments], 3600);
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
        if ($path === '' || ! is_executable($path)) {
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
