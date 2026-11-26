<?php

namespace App\Http\Controllers\Api\V1\Subcontracts;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcontracts\StoreValuationDocumentsRequest;
use App\Models\SubcontractValuation;
use App\Models\SubcontractValuationDocument;
use App\Support\UploadedFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Supporting documents of a valuation, such as the site engineer's signed statement.
 */
class SubcontractValuationDocumentController extends Controller
{
    public function store(StoreValuationDocumentsRequest $request, SubcontractValuation $valuation): JsonResponse
    {
        $disk = (string) config('filesystems.equipment_documents_disk');

        foreach ($request->file('documents', []) as $file) {
            $valuation->documents()->create([
                'type' => SubcontractValuationDocument::TYPE_STATEMENT,
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => UploadedFileStorage::store($file, "subcontract-valuations/{$valuation->id}", $disk),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ]);
        }

        return response()->json(['data' => ['documents' => $valuation->documents()->count()]], 201);
    }

    public function show(Request $request, SubcontractValuation $valuation, SubcontractValuationDocument $document): StreamedResponse
    {
        abort_unless($document->valuation_id === $valuation->id, 404);
        $headers = ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'];

        return $request->boolean('preview')
            ? Storage::disk($document->disk)->response($document->path, $document->original_name, $headers, 'inline')
            : Storage::disk($document->disk)->download($document->path, $document->original_name, $headers);
    }

    public function destroy(Request $request, SubcontractValuation $valuation, SubcontractValuationDocument $document): Response
    {
        abort_unless($request->user()?->role->canManageSubcontracts(), 403);
        abort_unless($document->valuation_id === $valuation->id, 404);
        Storage::disk($document->disk)->delete($document->path);
        $document->delete();

        return response()->noContent();
    }
}
