<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

/**
 * Restores a folder produced by `hourie:backup` onto this installation:
 * the database is replaced by the saved one and the uploaded files are put
 * back in their storage folders. Used to move the data to a new server.
 */
class RestoreHourieBackup extends Command
{
    protected $signature = 'hourie:restore
        {path : Backup folder containing database.zip, uploaded-files.zip and checksums.txt}
        {--force : Replace the current database without asking for confirmation}';

    protected $description = 'Restore a Hourie backup (database and uploaded files) onto this installation';

    /** Files from the backed-up private folder that belong to the old machine only. */
    private const SKIPPED_PRIVATE_ENTRIES = ['hourie-backup.lock', 'hourie-backup/'];

    public function handle(): int
    {
        $backupDirectory = rtrim((string) $this->argument('path'), '\\/');
        $workingDirectory = null;

        try {
            $this->verifyBackup($backupDirectory);

            $database = (string) config('database.connections.mysql.database');
            if (! $this->option('force') && ! $this->confirm("La base « {$database} » va être entièrement remplacée par la sauvegarde. Continuer ?")) {
                $this->warn('Restauration annulée.');

                return self::FAILURE;
            }

            $workingDirectory = storage_path('app/private/hourie-restore-'.bin2hex(random_bytes(6)));
            File::ensureDirectoryExists($workingDirectory);

            $this->info('Import de la base de données…');
            $sqlPath = $this->extractDatabase($backupDirectory.'/database.zip', $workingDirectory);
            Schema::dropAllTables();
            $this->importDatabase($sqlPath, $workingDirectory);

            $this->info('Restauration des documents importés…');
            $restoredFiles = $this->restoreUploads($backupDirectory.'/uploaded-files.zip');

            $this->info('Mise à jour du schéma…');
            $this->call('migrate', ['--force' => true, '--no-interaction' => true]);
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->delete();
            }
            $this->callSilently('optimize:clear');

            $missing = $this->missingDocumentFiles();
            $this->table(['Contrôle', 'Résultat'], [
                ['Fichiers restaurés', $restoredFiles],
                ['Utilisateurs', $this->countRows('users')],
                ['Équipements', $this->countRows('equipment')],
                ['Bons de commande', $this->countRows('purchase_orders')],
                ['Contrats de sous-traitance', $this->countRows('subcontracts')],
                ['Documents introuvables', count($missing)],
            ]);

            foreach (array_slice($missing, 0, 20) as $path) {
                $this->warn('Fichier manquant : '.$path);
            }

            if ($missing !== []) {
                $this->error('Restauration terminée, mais des documents référencés sont introuvables.');

                return self::FAILURE;
            }

            $this->info('Restauration terminée et vérifiée.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Échec de la restauration : '.$exception->getMessage());

            return self::FAILURE;
        } finally {
            if ($workingDirectory !== null) {
                File::deleteDirectory($workingDirectory);
            }
        }
    }

    private function verifyBackup(string $backupDirectory): void
    {
        foreach (['database.zip', 'uploaded-files.zip', 'checksums.txt'] as $file) {
            if (! File::isFile($backupDirectory.'/'.$file)) {
                throw new RuntimeException("Fichier de sauvegarde absent : {$file}");
            }
        }

        $lines = preg_split('/\R/', trim(File::get($backupDirectory.'/checksums.txt'))) ?: [];
        $checked = 0;
        foreach ($lines as $line) {
            if (preg_match('/^([a-f0-9]{64})\s+(\S+)$/', trim($line), $match) !== 1) {
                continue;
            }

            $file = $backupDirectory.'/'.basename($match[2]);
            if (! File::isFile($file) || ! hash_equals($match[1], (string) hash_file('sha256', $file))) {
                throw new RuntimeException("Somme de contrôle invalide pour {$match[2]} : le fichier est incomplet ou modifié.");
            }
            $checked++;
        }

        if ($checked < 2) {
            throw new RuntimeException('Le fichier checksums.txt est incomplet.');
        }
    }

    private function extractDatabase(string $archivePath, string $workingDirectory): string
    {
        $archive = new ZipArchive;
        if ($archive->open($archivePath) !== true) {
            throw new RuntimeException('Impossible d’ouvrir database.zip.');
        }

        try {
            if ($archive->locateName('database.sql') === false || ! $archive->extractTo($workingDirectory, 'database.sql')) {
                throw new RuntimeException('database.zip ne contient pas database.sql.');
            }
        } finally {
            $archive->close();
        }

        return $workingDirectory.'/database.sql';
    }

    private function importDatabase(string $sqlPath, string $workingDirectory): void
    {
        $binary = (string) config('hourie-backup.mysql_binary');
        if ($binary === '' || ((str_contains($binary, '/') || str_contains($binary, '\\')) && ! File::isFile($binary))) {
            throw new RuntimeException('Client MySQL introuvable : '.$binary);
        }

        $connection = config('database.connections.mysql');
        if (! is_array($connection) || empty($connection['database'])) {
            throw new RuntimeException('La connexion MySQL est invalide.');
        }

        $credentialsPath = $workingDirectory.'/mysql.cnf';
        File::put($credentialsPath, implode(PHP_EOL, [
            '[client]',
            'host='.$this->quoteOptionValue((string) ($connection['host'] ?? '127.0.0.1')),
            'port='.(int) ($connection['port'] ?? 3306),
            'user='.$this->quoteOptionValue((string) ($connection['username'] ?? '')),
            'password='.$this->quoteOptionValue((string) ($connection['password'] ?? '')),
            '',
        ]));
        chmod($credentialsPath, 0600);

        $input = fopen($sqlPath, 'rb');
        if ($input === false) {
            throw new RuntimeException('Impossible de lire le fichier SQL.');
        }

        try {
            $process = new Process([
                $binary,
                '--defaults-extra-file='.$credentialsPath,
                '--default-character-set=utf8mb4',
                (string) $connection['database'],
            ], base_path());
            $process->setInput($input)->setTimeout(3600)->run();
        } finally {
            fclose($input);
        }

        if (! $process->isSuccessful()) {
            $message = trim($process->getErrorOutput()) ?: trim($process->getOutput());
            throw new RuntimeException($message !== '' ? $message : 'L’import MySQL a échoué.');
        }
    }

    private function restoreUploads(string $archivePath): int
    {
        $targets = [
            'private' => storage_path('app/private'),
            'equipment-images' => (string) config('filesystems.disks.equipment-images.root'),
            'equipment-documents' => (string) config('filesystems.disks.equipment-documents.root'),
        ];

        $archive = new ZipArchive;
        if ($archive->open($archivePath) !== true) {
            throw new RuntimeException('Impossible d’ouvrir uploaded-files.zip.');
        }

        $restored = 0;
        try {
            for ($index = 0; $index < $archive->numFiles; $index++) {
                $name = (string) $archive->getNameIndex($index);
                if (str_ends_with($name, '/') || $name === 'README.txt') {
                    continue;
                }

                [$prefix, $relativePath] = array_pad(explode('/', $name, 2), 2, '');
                if (! isset($targets[$prefix]) || ! $this->isSafeRelativePath($relativePath)) {
                    throw new RuntimeException("Chemin inattendu dans l’archive : {$name}");
                }

                if ($prefix === 'private' && $this->isSkippedPrivateEntry($relativePath)) {
                    continue;
                }

                $destination = $targets[$prefix].DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
                File::ensureDirectoryExists(dirname($destination));

                $source = $archive->getStream($name);
                $target = fopen($destination, 'wb');
                if ($source === false || $target === false) {
                    throw new RuntimeException("Impossible de restaurer {$name}.");
                }

                try {
                    stream_copy_to_stream($source, $target);
                } finally {
                    fclose($source);
                    fclose($target);
                }
                $restored++;
            }
        } finally {
            $archive->close();
        }

        return $restored;
    }

    private function isSafeRelativePath(string $path): bool
    {
        if ($path === '' || str_starts_with($path, '/') || str_contains($path, '\\') || preg_match('/^[A-Za-z]:/', $path) === 1) {
            return false;
        }

        return ! in_array('..', explode('/', $path), true);
    }

    private function isSkippedPrivateEntry(string $relativePath): bool
    {
        foreach (self::SKIPPED_PRIVATE_ENTRIES as $entry) {
            if ($relativePath === $entry || (str_ends_with($entry, '/') && str_starts_with($relativePath, $entry))) {
                return true;
            }
        }

        return str_starts_with($relativePath, 'hourie-restore-');
    }

    /**
     * Every stored document row points to a disk and a path; list the ones
     * whose file is not on this server.
     *
     * @return list<string>
     */
    private function missingDocumentFiles(): array
    {
        $missing = [];

        foreach (Schema::getTableListing(schemaQualified: false) as $table) {
            foreach ([['disk', 'path'], ['pdf_disk', 'pdf_path']] as [$diskColumn, $pathColumn]) {
                if (! Schema::hasColumns($table, [$diskColumn, $pathColumn])) {
                    continue;
                }

                DB::table($table)
                    ->whereNotNull($diskColumn)
                    ->whereNotNull($pathColumn)
                    ->select([$diskColumn, $pathColumn])
                    ->orderBy($pathColumn)
                    ->each(function (object $row) use ($table, $diskColumn, $pathColumn, &$missing): void {
                        $disk = (string) $row->{$diskColumn};
                        $path = (string) $row->{$pathColumn};

                        if (config("filesystems.disks.{$disk}") === null || ! Storage::disk($disk)->exists($path)) {
                            $missing[] = "{$table}: {$disk}/{$path}";
                        }
                    });
            }
        }

        return $missing;
    }

    private function countRows(string $table): int|string
    {
        return Schema::hasTable($table) ? DB::table($table)->count() : '—';
    }

    private function quoteOptionValue(string $value): string
    {
        return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
    }
}
