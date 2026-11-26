<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Situation {{ $valuation->reference }}</title>
    @include('subcontract-valuations.partials.styles')
</head>
<body>
@php
    $calc = $data['calculation'];
    $isAdvance = $valuation->kind === \App\Models\SubcontractValuation::KIND_ADVANCE;
    $isOpening = $valuation->kind === \App\Models\SubcontractValuation::KIND_OPENING;
    $isRegular = ! $isAdvance && ! $isOpening;
    $currency = $subcontract->currency === 'XOF' ? 'F CFA' : $subcontract->currency;
    $n = static fn ($value): float => (float) (string) $value;
    $money = static fn ($value): string => number_format((float) (string) $value, abs((float) (string) $value - round((float) (string) $value)) > 0.004 ? 2 : 0, ',', ' ');
    $qty = static fn ($value): string => rtrim(rtrim(number_format((float) (string) $value, 3, ',', ' '), '0'), ',');
    $rate = static fn ($value): string => rtrim(rtrim(number_format((float) (string) $value, 2, ',', ' '), '0'), ',');
    $date = static fn ($value): string => $value ? \Carbon\Carbon::parse($value)->locale('fr')->translatedFormat('j M Y') : '—';
    $statusLabels = ['draft' => 'Brouillon', 'submitted' => 'Soumise pour approbation', 'approved' => 'Approuvée', 'partially_paid' => 'Partiellement payée', 'paid' => 'Payée'];
    $isCertified = $valuation->isCertified();
    $hasCash = $n($calc['cash_amount']) > 0;
    $hasVat = $n($calc['vat_amount']) > 0;
    $hasAdvance = $n($subcontract->advance_amount) > 0;
    $hasRetention = $n($subcontract->retention_rate) > 0;
    $lines = collect($data['lines']);
    $shownLines = $lines->filter(fn ($line) => $n($line['cumulative_quantity']) > 0 || $n($line['period_quantity']) != 0)->values();
    $hasLocations = $lines->contains(fn ($line) => filled($line['location']));
    $historical = $n($calc['historical_works']);
    $title = $isAdvance ? 'AVANCE DE DÉMARRAGE' : ($isOpening ? 'REPRISE DE L’HISTORIQUE' : 'SITUATION DE TRAVAUX');
    $channelLabels = ['cash' => 'Espèces', 'cheque' => 'Chèque / virement (HT)', 'vat' => 'TVA'];
    $shownChannels = collect(['cash', 'cheque', 'vat'])->filter(fn ($channel) => $n($contractChannels[$channel]['due']) > 0 || $n($data['channels'][$channel]['due']) > 0);
@endphp
<div class="page">
    <div class="header">
        <img class="logo" src="{{ $logoDataUri }}" alt="A.R. Hourie Entreprises">
        <div class="title">
            <h1>{{ $title }}</h1>
            <div class="number">{{ $isRegular ? 'N° '.str_pad((string) $valuation->sequence, 2, '0', STR_PAD_LEFT).' · ' : '' }}{{ $valuation->reference }}</div>
            <div class="status">{{ $statusLabels[$valuation->status] ?? $valuation->status }}</div>
        </div>
    </div>

    @unless ($isCertified)
        <div class="draft">DOCUMENT DE TRAVAIL — situation non approuvée, les montants peuvent encore changer.</div>
    @endunless

    <table class="info">
        <tr>
            <td><span class="label">Chantier</span><span class="value">{{ $subcontract->project->code }} · {{ $subcontract->project->name }}</span></td>
            <td><span class="label">Sous-traitant</span><span class="value">{{ $subcontract->subcontractor->name }}</span></td>
            <td><span class="label">Contrat</span><span class="value">{{ $subcontract->reference }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Objet</span><span class="value">{{ $subcontract->title }}</span></td>
            <td><span class="label">{{ $isAdvance ? 'Date' : 'Date de la situation' }}</span><span class="value">{{ $date($valuation->valuation_date) }}</span></td>
            <td><span class="label">{{ $isAdvance ? 'Versement' : 'Travaux exécutés jusqu’au' }}</span><span class="value">{{ $date($valuation->period_end) }}</span></td>
        </tr>
    </table>

    @unless ($isAdvance)
        <h2>1 · Travaux exécutés</h2>
        <table class="grid">
            <thead>
                <tr>
                    <th style="width: {{ $hasLocations ? '27%' : '39%' }}">Désignation</th>
                    @if ($hasLocations)<th style="width: 12%">Profil / lieu</th>@endif
                    <th style="width: 5%">Unité</th><th style="width: 9%">Prix unit.</th><th style="width: 7%">Qté préc.</th><th style="width: 7%">Qté période</th><th style="width: 7%">Qté cumul</th><th style="width: 13%">Montant période</th><th style="width: 13%">Montant cumulé</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($shownLines as $line)
                    <tr>
                        <td>{{ $line['description'] }}<br><span class="muted">{{ $line['code'] }}</span></td>
                        @if ($hasLocations)<td>{{ $line['location'] }}</td>@endif
                        <td style="text-align: center">{{ $line['unit'] }}</td>
                        <td class="num">{{ $money($line['unit_price']) }}</td>
                        <td class="num">{{ $qty($line['previous_quantity']) }}</td>
                        <td class="num"><b>{{ $qty($line['period_quantity']) }}</b></td>
                        <td class="num">{{ $qty($line['cumulative_quantity']) }}</td>
                        <td class="num"><b>{{ $money($line['period_amount']) }}</b></td>
                        <td class="num">{{ $money($line['cumulative_amount']) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="{{ $hasLocations ? 9 : 8 }}" class="muted">Aucune quantité saisie.</td></tr>
                @endforelse
                @if ($historical > 0)
                    <tr>
                        <td colspan="{{ $hasLocations ? 7 : 6 }}" class="muted">Travaux antérieurs à Hourie non détaillés par article</td>
                        <td class="num">—</td>
                        <td class="num">{{ $money($historical) }}</td>
                    </tr>
                @endif
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="{{ $hasLocations ? 7 : 6 }}">Total ({{ $currency }} HT)</td>
                    <td class="num">{{ $isRegular ? $money($calc['works_this_period']) : '—' }}</td>
                    <td class="num">{{ $money($calc['works_cumulative']) }}</td>
                </tr>
            </tfoot>
        </table>
    @endunless

        <h2>{{ $isAdvance ? '1' : '2' }} · Calcul du montant à payer ({{ $currency }})</h2>
        <table class="calc">
            @if ($isAdvance)
                <tr class="sub"><td class="label">Avance de démarrage (HT)</td><td class="num">{{ $money($calc['net_before_vat']) }}</td></tr>
            @else
                <tr><td class="label">Travaux exécutés (cumul)</td><td class="num">{{ $money($calc['works_cumulative']) }}</td></tr>
                @if ($hasAdvance)<tr><td class="label">Récupération de l’avance ({{ $rate($subcontract->advance_recovery_rate) }} %, cumul)</td><td class="num">- {{ $money($calc['advance_recovery_cumulative']) }}</td></tr>@endif
                @if ($hasRetention)<tr><td class="label">Retenue de garantie ({{ $rate($subcontract->retention_rate) }} %, cumul)</td><td class="num">- {{ $money($calc['retention_cumulative']) }}</td></tr>@endif
                <tr class="sub"><td class="label">Montant certifié cumulé</td><td class="num">{{ $money($calc['certified_cumulative']) }}</td></tr>
                @if ($isRegular)
                    <tr><td class="label">Moins déjà certifié (situations précédentes)</td><td class="num">- {{ $money($calc['previously_certified']) }}</td></tr>
                    <tr class="sub"><td class="label">Montant de la situation</td><td class="num">{{ $money($calc['this_valuation_before_vat']) }}</td></tr>
                    @if ($n($calc['materials_deduction']) > 0)<tr><td class="label">Moins matériaux fournis par ARH</td><td class="num">- {{ $money($calc['materials_deduction']) }}</td></tr>@endif
                    @if ($n($calc['backcharges']) > 0)<tr><td class="label">Moins pénalités et retenues diverses{{ $subcontract->recurring_deduction_label ? ' (dont '.$subcontract->recurring_deduction_label.')' : '' }}</td><td class="num">- {{ $money($calc['backcharges']) }}</td></tr>@endif
                @endif
            @endif
            <tr class="sub"><td class="label">Net hors TVA</td><td class="num">{{ $money($calc['net_before_vat']) }}</td></tr>
            @if ($hasCash)
                <tr class="indent"><td class="label">dont espèces ({{ $rate($valuation->cash_percent) }} %)</td><td class="num">{{ $money($calc['cash_amount']) }}</td></tr>
                <tr class="indent"><td class="label">dont chèque ou virement</td><td class="num">{{ $money($calc['cheque_amount']) }}</td></tr>
            @endif
            @if ($hasVat)<tr><td class="label">TVA ({{ $rate($subcontract->vat_rate) }} %{{ $hasCash ? ' sur la part chèque ou virement' : '' }})</td><td class="num">{{ $money($calc['vat_amount']) }}</td></tr>@endif
            <tr class="total"><td class="label">NET À PAYER</td><td class="num">{{ $money($calc['net_due']) }}</td></tr>
        </table>
        @if ($isRegular && $data['requires_invoice'])
            <p class="note">Facture attendue du sous-traitant : <b>{{ $money($data['invoice_expected']) }} {{ $currency }}</b>{{ $hasCash ? ' (part chèque ou virement, TVA comprise)' : '' }}.@if ($data['invoice']) Facture n° {{ $data['invoice']['number'] }} du {{ $date($data['invoice']['date']) }} : {{ $money($data['invoice']['amount']) }} — {{ $data['invoice']['matches'] ? 'conforme' : 'écart de '.$money($data['invoice']['difference']) }}.@endif</p>
        @endif

    <table class="info" style="margin-top: 2.5mm">
        <tr>
            <td><span class="label">Montant révisé du contrat</span><span class="value">{{ $money(collect($subcontract->items)->reduce(fn ($total, $item) => $total + $n($item->authorizedQuantity()) * $n($item->unit_price), 0)) }}</span></td>
            @unless ($isAdvance)<td><span class="label">Travaux exécutés (cumul)</span><span class="value">{{ $money($calc['works_cumulative']) }}</span></td>@endunless
            @if ($hasAdvance && ! $isAdvance)<td><span class="label">Avance restant à récupérer</span><span class="value">{{ $money($calc['advance_remaining']) }}</span></td>@endif
            @if ($hasRetention && ! $isAdvance)<td><span class="label">Retenue de garantie détenue</span><span class="value">{{ $money($calc['retention_cumulative']) }}</span></td>@endif
        </tr>
    </table>

    <h2>{{ $isAdvance ? '2' : '3' }} · Règlements ({{ $currency }})</h2>
    <table class="grid">
        <thead>
            <tr>
                <th rowspan="2" style="width: 22%">Mode de règlement</th>
                <th colspan="3">Cette {{ $isRegular ? 'situation' : 'pièce' }}</th>
                <th colspan="3">Cumul du contrat{{ $isCertified ? '' : ' (situations approuvées)' }}</th>
            </tr>
            <tr><th>À payer</th><th>Payé</th><th>Reste</th><th>À payer</th><th>Payé</th><th>Reste</th></tr>
        </thead>
        <tbody>
            @foreach ($shownChannels as $channel)
                <tr>
                    <td>{{ $channelLabels[$channel] }}</td>
                    <td class="num">{{ $money($data['channels'][$channel]['due']) }}</td>
                    <td class="num">{{ $money($data['channels'][$channel]['paid']) }}</td>
                    <td class="num"><b>{{ $money($data['channels'][$channel]['balance']) }}</b></td>
                    <td class="num">{{ $money($contractChannels[$channel]['due']) }}</td>
                    <td class="num">{{ $money($contractChannels[$channel]['paid']) }}</td>
                    <td class="num"><b>{{ $money($contractChannels[$channel]['balance']) }}</b></td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td>Total</td>
                <td class="num">{{ $money($calc['net_due']) }}</td>
                <td class="num">{{ $money($data['paid_amount']) }}</td>
                <td class="num">{{ $money($data['balance_due']) }}</td>
                <td class="num">{{ $money(collect($contractChannels)->reduce(fn ($total, $channel) => $total + $n($channel['due']), 0)) }}</td>
                <td class="num">{{ $money(collect($contractChannels)->reduce(fn ($total, $channel) => $total + $n($channel['paid']), 0)) }}</td>
                <td class="num">{{ $money(collect($contractChannels)->reduce(fn ($total, $channel) => $total + $n($channel['balance']), 0)) }}</td>
            </tr>
        </tfoot>
    </table>

    @if ($valuation->comment)
        <div class="comment"><b>Commentaire :</b> {{ $valuation->comment }}</div>
    @endif

    <table class="signatures">
        <tr>
            <td><div class="role">Établi par (ingénieur)</div><div class="line">Nom, date et signature</div></td>
            <td><div class="role">Vérifié par (chef de projet)</div><div class="line">Nom, date et signature</div></td>
            <td><div class="role">Approuvé par (direction)</div><div class="line">Nom, date, signature et cachet</div></td>
            <td><div class="role">Le sous-traitant (lu et approuvé)</div><div class="line">Nom, date, signature et cachet</div></td>
        </tr>
    </table>
    <p class="note">Page 1 · document établi depuis Hourie. La certification de la situation ne vaut pas ordre de paiement. Imprimé le {{ $date(now()) }}.</p>
</div>

@php
    $current = $isAdvance ? null : $valuation;
    $basis = $isAdvance ? $subcontract->lastCertifiedValuation() : $valuation;
    $highlightId = $valuation->id;
    $detailReference = $valuation->reference;
@endphp
@include('subcontract-valuations.partials.contract-detail')
</body>
</html>
