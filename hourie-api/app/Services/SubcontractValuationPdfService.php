<?php

namespace App\Services;

use App\Http\Resources\SubcontractValuationResource;
use App\Models\Subcontract;
use App\Models\SubcontractValuation;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * The company's standard "Situation de travaux" document: the same layout for
 * every subcontractor and every engineer, drawn from what is saved in Hourie.
 * It is drawn on each request, so it always shows the current amounts and
 * payments; blocks that do not apply (advance, retention, cash) are hidden.
 */
class SubcontractValuationPdfService
{
    public function render(SubcontractValuation $valuation): string
    {
        $valuation->loadMissing([
            'subcontract.subcontractor', 'subcontract.project:id,code,name', 'subcontract.items.variationLines',
            'subcontract.valuations.payments', 'lines', 'documents', 'payments.recorder:id,name', 'approver:id,name',
        ]);
        $subcontract = $valuation->subcontract;
        $data = (new SubcontractValuationResource($valuation))->resolve();

        return $this->draw('subcontract-valuations.pdf', [
            'valuation' => $valuation,
            'subcontract' => $subcontract,
            'data' => $data,
            'contractChannels' => $subcontract->channelTotals(),
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function draw(string $view, array $data): string
    {
        $options = new Options;
        $options->set('defaultFont', 'Helvetica');
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view($view, [
            ...$data,
            'logoDataUri' => $this->dataUri(resource_path('images/logo-hourie.jpg'), 'image/jpeg'),
        ])->render());
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Sheet for the next situation, to fill in by hand on site: every work
     * item with its previous quantity, the period columns left empty, and the
     * contract's detail (advance, retention, payments) as of today.
     */
    public function renderBlank(Subcontract $subcontract): string
    {
        $subcontract->loadMissing(['subcontractor', 'project:id,code,name', 'items.variationLines', 'valuations.payments']);
        $lastCertified = $subcontract->lastCertifiedValuation();

        return $this->draw('subcontract-valuations.blank', [
            'subcontract' => $subcontract,
            'nextSequence' => ((int) $subcontract->valuations()->max('sequence')) + 1,
            'previousQuantities' => app(SubcontractValuationCalculator::class)->previousQuantities($subcontract),
            'lastCertified' => $lastCertified,
            'contractChannels' => $subcontract->channelTotals(),
        ]);
    }

    public function blankFilename(Subcontract $subcontract): string
    {
        return 'Fiche_situation_'.$subcontract->reference.'.pdf';
    }

    public function filename(SubcontractValuation $valuation): string
    {
        $subcontractor = Str::of($valuation->subcontract->subcontractor->name)
            ->ascii()
            ->replaceMatches('/[^A-Za-z0-9]+/', '_')
            ->trim('_')
            ->upper();

        return 'Situation_'.$valuation->reference.($subcontractor->isNotEmpty() ? '_'.$subcontractor : '').'.pdf';
    }

    private function dataUri(string $path, string $mimeType): string
    {
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException("Unable to read PDF image asset: {$path}");
        }

        return 'data:'.$mimeType.';base64,'.base64_encode($contents);
    }
}
