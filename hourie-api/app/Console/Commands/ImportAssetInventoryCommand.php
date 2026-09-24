<?php

namespace App\Console\Commands;

use App\Actions\Equipment\ImportAssetInventory;
use App\Models\User;
use App\Support\Spreadsheet\XlsxReader;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('equipment:import-assets {path : Path to the XLSX workbook} {--dry-run : Validate the canonical sheet without writing data} {--user= : E-mail of the importing user}')]
#[Description('Import the canonical multi-category asset inventory workbook')]
class ImportAssetInventoryCommand extends Command
{
    public function handle(XlsxReader $reader, ImportAssetInventory $importer): int
    {
        $path = realpath((string) $this->argument('path'));
        if ($path === false || ! is_file($path) || ! is_readable($path)) {
            $this->error('Fichier Excel introuvable ou illisible.');

            return self::FAILURE;
        }

        $actor = null;
        $email = $this->option('user');
        if (is_string($email) && $email !== '') {
            $actor = User::query()->where('email', mb_strtolower(trim($email)))->first();
            if ($actor === null) {
                $this->error('Utilisateur introuvable.');

                return self::FAILURE;
            }
        }

        try {
            $rows = $reader->rows($path, ImportAssetInventory::SHEET_NAME);
            $validRows = collect($rows)->filter(fn (array $row, int $number): bool => $number > 5 && filled($row['D'] ?? null) && filled($row['E'] ?? null));
            $this->info('Feuille canonique : '.ImportAssetInventory::SHEET_NAME);
            $this->info('Lignes importables : '.$validRows->count());
            $this->info('Les autres feuilles sont des vues régionales répétées et ne seront pas importées.');

            if ($this->option('dry-run')) {
                return self::SUCCESS;
            }

            $result = $importer->handle(basename($path), hash_file('sha256', $path), $rows, $actor);
            $this->info('Import terminé : '.($result->summary['imported_rows'] ?? 0).' ajoutés, '.($result->summary['skipped_rows'] ?? 0).' doublons ignorés.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            report($exception);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
