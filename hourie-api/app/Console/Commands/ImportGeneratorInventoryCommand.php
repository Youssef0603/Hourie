<?php

namespace App\Console\Commands;

use App\Actions\Equipment\ImportGeneratorInventory;
use App\Models\User;
use App\Support\Spreadsheet\XlsxReader;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Throwable;

#[Signature('equipment:import-generators {path : Path to the XLSX workbook} {--dry-run : Validate without writing data} {--user= : Email of the user responsible for the import}')]
#[Description('Validate or import the initial generator inventory workbook')]
class ImportGeneratorInventoryCommand extends Command
{
    public function handle(XlsxReader $reader, ImportGeneratorInventory $importer): int
    {
        $path = realpath((string) $this->argument('path'));

        if ($path === false || ! is_file($path) || ! is_readable($path)) {
            $this->error(__('imports.errors.file_missing'));

            return self::FAILURE;
        }

        $actor = null;
        $userEmail = $this->option('user');

        if (is_string($userEmail) && $userEmail !== '') {
            $actor = User::query()->where('email', mb_strtolower(trim($userEmail)))->first();

            if ($actor === null) {
                $this->error(__('imports.errors.user_missing'));

                return self::FAILURE;
            }
        }

        try {
            $rows = $reader->rows($path, 'Sheet1');
            $inspection = $importer->inspect($rows);

            $this->table(
                [__('imports.summary.metric'), __('imports.summary.value')],
                [
                    [__('imports.summary.inventory_rows'), $inspection['rows']],
                    [__('imports.summary.warning_rows'), count($inspection['warnings'])],
                    [__('imports.summary.error_rows'), count($inspection['errors'])],
                ],
            );

            foreach ($inspection['errors'] as $rowNumber => $error) {
                $this->error(__('imports.summary.row', ['row' => $rowNumber]).': '.$error);
            }

            if ($inspection['errors'] !== []) {
                return self::FAILURE;
            }

            if ($this->option('dry-run')) {
                $this->info(__('imports.validated'));

                return self::SUCCESS;
            }

            $equipmentImport = $importer->handle(
                basename($path),
                hash_file('sha256', $path),
                $rows,
                $actor,
            );

            $this->info(__('imports.completed', [
                'count' => $equipmentImport->summary['imported_rows'],
            ]));

            return self::SUCCESS;
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }

            return self::FAILURE;
        } catch (Throwable $exception) {
            report($exception);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
