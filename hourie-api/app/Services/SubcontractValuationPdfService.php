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
 * The company's subcontractor valuation, laid out exactly like the PM's file:
 * the DG synthesis first, then the valuation (sections A to G), drawn
 * from what is saved in Hourie on each request. The advance entry, which is
 * not a valuation, keeps its own one-page document.
 */
class SubcontractValuationPdfService
{
    public function __construct(private SubcontractValuationStatement $statement) {}

    public function render(SubcontractValuation $valuation): string
    {
        $valuation->loadMissing([
            'subcontract.subcontractor', 'subcontract.project:id,code,name', 'subcontract.items.variationLines',
            'subcontract.valuations.payments', 'lines', 'documents', 'payments.recorder:id,name', 'approver:id,name',
        ]);
        $subcontract = $valuation->subcontract;

        if (! $valuation->isAdvance()) {
            return $this->draw('subcontract-valuations.valuation', [
                'valuation' => $valuation,
                'subcontract' => $subcontract,
                'statement' => $this->statement->build($valuation),
            ]);
        }

        $data = (new SubcontractValuationResource($valuation))->resolve();

        return $this->draw('subcontract-valuations.advance', [
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
     * Sheet for the next situation, in the PM's layout: the contract and its
     * history are filled in (previously certified works, advance and retention
     * brought forward, what is still owed), and every figure that depends on
     * the new period is left empty for the engineer to write in. Nothing is saved.
     */
    public function renderBlank(Subcontract $subcontract): string
    {
        $subcontract->loadMissing(['subcontractor', 'project:id,code,name', 'items.variationLines', 'valuations.payments']);
        $previous = $subcontract->lastCertifiedValuation();

        $next = new SubcontractValuation([
            'sequence' => ((int) $subcontract->valuations()->max('sequence')) + 1,
            'kind' => SubcontractValuation::KIND_REGULAR,
            'status' => SubcontractValuation::STATUS_DRAFT,
            'cash_percent' => $subcontract->cash_percent,
            'materials_on_site' => $previous?->materials_on_site ?? 0,
            'claims' => $previous?->claims ?? 0,
            'materials_deduction' => 0,
            'backcharges' => $subcontract->recurring_deduction_amount ?? 0,
            'works_cumulative' => $previous?->works_cumulative ?? 0,
            'works_previous' => $previous?->works_cumulative ?? 0,
            'advance_recovery_cumulative' => $previous?->advance_recovery_cumulative ?? 0,
            'advance_recovery_previous' => $previous?->advance_recovery_cumulative ?? 0,
            'retention_cumulative' => $previous?->retention_cumulative ?? 0,
            'retention_previous' => $previous?->retention_cumulative ?? 0,
            'cash_amount' => 0,
            'cheque_amount' => 0,
            'vat_amount' => 0,
            'net_due' => 0,
        ]);
        $next->subcontract_id = $subcontract->id;
        $next->setRelation('subcontract', $subcontract);
        $next->setRelation('lines', collect());
        $next->setRelation('payments', collect());
        $next->setRelation('documents', collect());

        return $this->draw('subcontract-valuations.valuation', [
            'valuation' => $next,
            'subcontract' => $subcontract,
            'statement' => $this->blankStatement($this->statement->build($next)),
            'blank' => true,
        ]);
    }

    /**
     * Keeps everything known before the new period: the history brought
     * forward, what was already paid (nothing yet on the new situation), the
     * lines Hourie keeps at zero and the contract's fixed deduction. Every
     * figure the new quantities change is emptied.
     *
     * @param  array<string, mixed>  $statement
     * @return array<string, mixed>
     */
    private function blankStatement(array $statement): array
    {
        $known = ['03A', '07', '12', '14', '15', '17', '19', '20', '23', '25', '31', '32', '33', '38', '43', '44', '47'];
        $statement['lines'] = collect($statement['lines'])->map(fn ($amount, $line) => in_array((string) $line, $known, true) ? $amount : null)->all();
        $statement['current'] = array_map(fn () => null, $statement['current']);
        $statement['checks'] = array_map(fn () => null, $statement['checks']);
        $statement['passes'] = null;
        $statement['history']['current'] = ['net' => null, 'paid' => $statement['history']['current']['paid'], 'outstanding' => null];
        $statement['history']['total'] = ['net' => null, 'paid' => $statement['history']['total']['paid'], 'outstanding' => null];
        $empty = fn (array $channels): array => array_map(fn (array $amounts) => ['due' => null, 'paid' => $amounts['paid'], 'balance' => null], $channels);
        $statement['selected'] = $empty($statement['selected']);
        $statement['cumulative'] = $empty($statement['cumulative']);

        return $statement;
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
