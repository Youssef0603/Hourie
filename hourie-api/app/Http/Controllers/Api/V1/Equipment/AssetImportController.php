<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Actions\Equipment\ImportAssetInventory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\ImportEquipmentRequest;
use App\Support\Spreadsheet\XlsxReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AssetImportController extends Controller
{
    public function store(
        ImportEquipmentRequest $request,
        XlsxReader $reader,
        ImportAssetInventory $importer,
    ): JsonResponse {
        $file = $request->file('file');
        $path = $file?->getRealPath();

        if ($file === null || $path === false || $path === null) {
            throw ValidationException::withMessages([
                'file' => [__('imports.errors.file_missing')],
            ]);
        }

        try {
            $rows = $reader->rows($path, ImportAssetInventory::SHEET_NAME);
            $equipmentImport = $importer->handle(
                $file->getClientOriginalName(),
                hash_file('sha256', $path),
                $rows,
                $request->user(),
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'file' => [$exception->getMessage()],
            ]);
        }

        return response()->json([
            'data' => [
                'id' => $equipmentImport->id,
                'original_filename' => $equipmentImport->original_filename,
                'status' => $equipmentImport->status->value,
                'imported_at' => $equipmentImport->imported_at?->toISOString(),
                'summary' => $equipmentImport->summary,
            ],
        ], 201);
    }
}
