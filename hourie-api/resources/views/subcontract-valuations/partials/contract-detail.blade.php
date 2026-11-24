<div class="page page-break">
@php
    $advanceAmount = $n($subcontract->advance_amount);
    // $basis: the entry whose cumulative figures apply (this situation, or the last approved one);
    // $current: the situation being printed, if any; $highlightId: the row to highlight.
    $recoveryCumulative = $n($basis?->advance_recovery_cumulative ?? 0);
    $recoveryPrevious = $current ? $n($current->advance_recovery_previous) : $recoveryCumulative;
    $retentionCumulative = $n($basis?->retention_cumulative ?? 0);
    $retentionPrevious = $current ? $n($current->retention_previous) : $retentionCumulative;
    $certifiedNet = $n($basis?->works_cumulative ?? 0) - $recoveryCumulative - $retentionCumulative;
    $entries = $subcontract->valuations->filter(fn ($entry) => $entry->isCertified() || $entry->id === $highlightId)->sortBy('sequence')->values();
    $entryLabel = fn ($entry) => match ($entry->kind) {
        \App\Models\SubcontractValuation::KIND_ADVANCE => 'Avance de démarrage',
        \App\Models\SubcontractValuation::KIND_OPENING => 'Reprise (situations papier n° 1 à '.$entry->sequence.')',
        default => 'Situation n° '.str_pad((string) $entry->sequence, 2, '0', STR_PAD_LEFT),
    };
    $sum = fn (callable $value) => $entries->reduce(fn ($total, $entry) => $total + $value($entry), 0);
    $paidHt = $n($contractChannels['cash']['paid']) + $n($contractChannels['cheque']['paid']);
    $dueHt = $n($contractChannels['cash']['due']) + $n($contractChannels['cheque']['due']);
@endphp
    <div class="small-header">
        <img src="{{ $logoDataUri }}" alt="A.R. Hourie Entreprises">
        <div class="t"><b>DÉTAIL DU CONTRAT</b><span>{{ $detailReference }} · {{ $subcontract->subcontractor->name }}</span></div>
    </div>

    @if ($basis && ($hasAdvance || $hasRetention))
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed">
            <tr>
                @if ($hasAdvance)
                <td style="vertical-align: top; padding: 0 {{ $hasRetention ? '2mm' : '0' }} 0 0">
                    <h2>A · Avance de démarrage ({{ $currency }})</h2>
                    <table class="calc">
                        <tr><td class="label">Avance versée au sous-traitant</td><td class="num">{{ $money($advanceAmount) }}</td></tr>
                        <tr><td class="label">Récupérée sur les situations précédentes</td><td class="num">{{ $money($recoveryPrevious) }}</td></tr>
                        @if ($current)<tr><td class="label">Récupérée sur cette situation ({{ $rate($subcontract->advance_recovery_rate) }} %)</td><td class="num">{{ $money($recoveryCumulative - $recoveryPrevious) }}</td></tr>@endif
                        <tr class="sub"><td class="label">Total récupéré</td><td class="num">{{ $money($recoveryCumulative) }}</td></tr>
                        <tr class="total"><td class="label">RESTE À RÉCUPÉRER</td><td class="num">{{ $money($advanceAmount - $recoveryCumulative) }}</td></tr>
                    </table>
                </td>
                @endif
                @if ($hasRetention)
                <td style="vertical-align: top; padding: 0 0 0 {{ $hasAdvance ? '2mm' : '0' }}">
                    <h2>B · Retenue de garantie ({{ $currency }})</h2>
                    <table class="calc">
                        <tr><td class="label">Retenue des situations précédentes</td><td class="num">{{ $money($retentionPrevious) }}</td></tr>
                        @if ($current)<tr><td class="label">Retenue sur cette situation ({{ $rate($subcontract->retention_rate) }} %)</td><td class="num">{{ $money($retentionCumulative - $retentionPrevious) }}</td></tr>@endif
                        <tr><td class="label">Retenue libérée</td><td class="num">0</td></tr>
                        <tr class="sub"><td class="label">&nbsp;</td><td class="num">&nbsp;</td></tr>
                        <tr class="total"><td class="label">RETENUE DÉTENUE</td><td class="num">{{ $money($retentionCumulative) }}</td></tr>
                    </table>
                </td>
                @endif
            </tr>
        </table>
    @endif

    <h2>C · Situation financière cumulée ({{ $currency }}, hors TVA)</h2>
    <table class="calc">
        @if ($basis)<tr><td class="label">Travaux certifiés nets (après avance récupérée et retenue)</td><td class="num">{{ $money($certifiedNet) }}</td></tr>@endif
        @if ($hasAdvance)<tr><td class="label">Avance de démarrage</td><td class="num">{{ $money($advanceAmount) }}</td></tr>@endif
        <tr class="sub"><td class="label">Total dû au sous-traitant (approuvé{{ $current && ! $current->isCertified() ? ', hors cette situation' : '' }})</td><td class="num">{{ $money($dueHt) }}</td></tr>
        @if ($hasCash)
            <tr class="indent"><td class="label">payé en espèces</td><td class="num">{{ $money($contractChannels['cash']['paid']) }}</td></tr>
            <tr class="indent"><td class="label">payé par chèque ou virement (HT)</td><td class="num">{{ $money($contractChannels['cheque']['paid']) }}</td></tr>
        @endif
        <tr><td class="label">Total payé (HT)</td><td class="num">{{ $money($paidHt) }}</td></tr>
        <tr class="total"><td class="label">RESTE À PAYER (HT)</td><td class="num">{{ $money($dueHt - $paidHt) }}</td></tr>
        @if ($n($contractChannels['vat']['due']) > 0)
            <tr><td class="label">TVA due / payée / restante</td><td class="num">{{ $money($contractChannels['vat']['due']) }} / {{ $money($contractChannels['vat']['paid']) }} / <b>{{ $money($contractChannels['vat']['balance']) }}</b></td></tr>
        @endif
    </table>

    <h2>D · Historique des règlements ({{ $currency }})</h2>
    <table class="grid">
        <thead>
            <tr>
                <th style="width: 27%">Pièce</th><th>Date</th><th>Net HT</th><th>TVA</th><th>Net à payer</th><th>Payé</th><th>Reste</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($entries as $entry)
                <tr class="{{ $entry->id === $highlightId ? 'current' : '' }}">
                    <td>{{ $entryLabel($entry) }}@if ($entry->id === $highlightId) <span class="muted">(cette pièce{{ $entry->isCertified() ? '' : ', non approuvée' }})</span>@endif</td>
                    <td style="text-align: center">{{ $date($entry->period_end) }}</td>
                    <td class="num">{{ $money($n($entry->cash_amount) + $n($entry->cheque_amount)) }}</td>
                    <td class="num">{{ $money($entry->vat_amount) }}</td>
                    <td class="num">{{ $money($entry->net_due) }}</td>
                    <td class="num">{{ $money($entry->paidAmount()) }}</td>
                    <td class="num"><b>{{ $money($entry->isCertified() ? $entry->balanceDue() : $n($entry->net_due)) }}</b></td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="2">Total</td>
                <td class="num">{{ $money($sum(fn ($entry) => $n($entry->cash_amount) + $n($entry->cheque_amount))) }}</td>
                <td class="num">{{ $money($sum(fn ($entry) => $n($entry->vat_amount))) }}</td>
                <td class="num">{{ $money($sum(fn ($entry) => $n($entry->net_due))) }}</td>
                <td class="num">{{ $money($sum(fn ($entry) => $n((string) $entry->paidAmount()))) }}</td>
                <td class="num">{{ $money($sum(fn ($entry) => $entry->isCertified() ? $n((string) $entry->balanceDue()) : $n($entry->net_due))) }}</td>
            </tr>
        </tfoot>
    </table>

    @php $payments = $subcontract->valuations->filter(fn ($entry) => $entry->isCertified() || $entry->id === $highlightId)->flatMap(fn ($entry) => $entry->payments->map(fn ($payment) => [$entryLabel($entry), $payment]))->sortBy(fn ($row) => $row[1]->paid_on)->values(); @endphp
    @if ($payments->isNotEmpty())
        <h2>E · Paiements enregistrés ({{ $currency }})</h2>
        <table class="grid">
            <thead><tr><th>Date</th><th style="width: 27%">Pièce</th><th>Mode</th><th>Référence</th><th>Montant</th><th>dont TVA</th></tr></thead>
            <tbody>
                @foreach ($payments as [$label, $payment])
                    <tr>
                        <td style="text-align: center">{{ $date($payment->paid_on) }}</td>
                        <td>{{ $label }}</td>
                        <td>{{ ['cash' => 'Espèces', 'cheque' => 'Chèque', 'transfer' => 'Virement'][$payment->method] ?? '—' }}</td>
                        <td>{{ $payment->reference ?: '—' }}</td>
                        <td class="num">{{ $money($payment->amount) }}</td>
                        <td class="num">{{ $n($payment->vat_amount) > 0 ? $money($payment->vat_amount) : '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <p class="note">Page 2 · détail établi depuis Hourie à partir des pièces approuvées et des paiements enregistrés. Imprimé le {{ $date(now()) }}.</p>
</div>
