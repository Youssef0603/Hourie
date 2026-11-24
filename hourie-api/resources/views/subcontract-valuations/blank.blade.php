<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Fiche de situation {{ $subcontract->reference }}</title>
    @include('subcontract-valuations.partials.styles')
    <style>
        .fill { background: #fffdf2; }
        .blank-line { display: block; margin-top: 1.5mm; border-bottom: .25mm dotted #5b6b82; height: 3.5mm; }
        .grid.sheet td { height: 7.5mm; }
        .deductions td { height: 9mm; }
    </style>
</head>
<body>
@php
    $currency = $subcontract->currency === 'XOF' ? 'F CFA' : $subcontract->currency;
    $n = static fn ($value): float => (float) (string) $value;
    $money = static fn ($value): string => number_format((float) (string) $value, abs((float) (string) $value - round((float) (string) $value)) > 0.004 ? 2 : 0, ',', ' ');
    $qty = static fn ($value): string => rtrim(rtrim(number_format((float) (string) $value, 3, ',', ' '), '0'), ',');
    $rate = static fn ($value): string => rtrim(rtrim(number_format((float) (string) $value, 2, ',', ' '), '0'), ',');
    $date = static fn ($value): string => $value ? \Carbon\Carbon::parse($value)->locale('fr')->translatedFormat('j M Y') : '—';
    $hasAdvance = $n($subcontract->advance_amount) > 0;
    $hasRetention = $n($subcontract->retention_rate) > 0;
    $hasCash = $n($subcontract->cash_percent) > 0;
    $number = str_pad((string) $nextSequence, 2, '0', STR_PAD_LEFT);
    $reference = $subcontract->reference.'-SIT-'.$number;
    $historical = $n($subcontract->historical_works_amount);
    $revised = collect($subcontract->items)->reduce(fn ($total, $item) => $total + $n($item->authorizedQuantity()) * $n($item->unit_price), 0);
    $hasFixedDeduction = $n($subcontract->recurring_deduction_amount) > 0;
@endphp
<div class="page">
    <div class="header">
        <img class="logo" src="{{ $logoDataUri }}" alt="A.R. Hourie Entreprises">
        <div class="title">
            <h1>SITUATION DE TRAVAUX</h1>
            <div class="number">N° {{ $number }} · {{ $reference }}</div>
            <div class="status">Fiche à remplir sur chantier</div>
        </div>
    </div>

    <table class="info">
        <tr>
            <td><span class="label">Chantier</span><span class="value">{{ $subcontract->project->code }} · {{ $subcontract->project->name }}</span></td>
            <td><span class="label">Sous-traitant</span><span class="value">{{ $subcontract->subcontractor->name }}</span></td>
            <td><span class="label">Contrat</span><span class="value">{{ $subcontract->reference }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Objet</span><span class="value">{{ $subcontract->title }}</span></td>
            <td class="fill"><span class="label">Date de la situation</span><span class="blank-line"></span></td>
            <td class="fill"><span class="label">Travaux exécutés jusqu’au</span><span class="blank-line"></span></td>
        </tr>
    </table>

    <h2>1 · Travaux exécutés</h2>
    <table class="grid sheet">
        <thead>
            <tr>
                <th style="width: 27%">Désignation</th>
                <th style="width: 13%">Profil / lieu</th>
                <th style="width: 5%">Unité</th>
                <th style="width: 9%">Prix unit.</th>
                <th style="width: 8%">Autorisé</th>
                <th style="width: 8%">Qté préc.</th>
                <th style="width: 9%">Qté période</th>
                <th style="width: 9%">Qté cumul</th>
                <th style="width: 12%">Montant période</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($subcontract->items as $item)
                <tr>
                    <td>{{ $item->description }}<br><span class="muted">{{ $item->code }}</span></td>
                    <td class="fill"></td>
                    <td style="text-align: center">{{ $item->unit }}</td>
                    <td class="num">{{ $money($item->unit_price) }}</td>
                    <td class="num">{{ $qty($item->authorizedQuantity()) }}</td>
                    <td class="num">{{ $qty($previousQuantities[$item->id] ?? 0) }}</td>
                    <td class="fill"></td>
                    <td class="fill"></td>
                    <td></td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr><td colspan="8">Total des travaux de la période ({{ $currency }} HT)</td><td></td></tr>
        </tfoot>
    </table>
    @if ($historical > 0)
        <p class="note">Les {{ $money($historical) }} {{ $currency }} de travaux antérieurs à Hourie non détaillés par article sont déjà compris dans le cumul du contrat.</p>
    @endif

    <h2>2 · Déductions de la période ({{ $currency }})</h2>
    <table class="grid deductions">
        <tr>
            <td style="width: 45%">Matériaux fournis par ARH (HT)</td>
            <td class="fill"></td>
        </tr>
        <tr>
            <td>Pénalités et retenues diverses{{ $hasFixedDeduction ? ' — dont '.($subcontract->recurring_deduction_label ?: 'retenue fixe').' : '.$money($subcontract->recurring_deduction_amount) : '' }}</td>
            <td class="fill">{{ $hasFixedDeduction ? $money($subcontract->recurring_deduction_amount).' +' : '' }}</td>
        </tr>
        <tr>
            <td>Commentaire</td>
            <td class="fill"></td>
        </tr>
    </table>

    <h2>3 · Rappel du contrat</h2>
    <table class="info">
        <tr>
            <td><span class="label">Montant révisé du contrat</span><span class="value">{{ $money($revised) }}</span></td>
            <td><span class="label">Exécuté (dernière situation approuvée)</span><span class="value">{{ $money($lastCertified?->works_cumulative ?? 0) }}</span></td>
            <td><span class="label">Dernière situation approuvée</span><span class="value">{{ $lastCertified ? $lastCertified->reference.' · '.$date($lastCertified->period_end) : 'Aucune' }}</span></td>
        </tr>
        <tr>
            <td><span class="label">Conditions</span><span class="value">@if ($hasAdvance)Avance récupérée à {{ $rate($subcontract->advance_recovery_rate) }} % · @endif @if ($hasRetention)Retenue {{ $rate($subcontract->retention_rate) }} % · @endif TVA {{ $rate($subcontract->vat_rate) }} %</span></td>
            <td><span class="label">Règlement</span><span class="value">{{ $hasCash ? $rate($subcontract->cash_percent).' % espèces · '.$rate(100 - $n($subcontract->cash_percent)).' % chèque ou virement' : 'Chèque ou virement' }}</span></td>
            <td><span class="label">Reste à payer au sous-traitant</span><span class="value">{{ $money(collect($contractChannels)->reduce(fn ($total, $channel) => $total + $n($channel['balance']), 0)) }}</span></td>
        </tr>
    </table>

    <table class="signatures">
        <tr>
            <td><div class="role">Établi par (ingénieur)</div><div class="line">Nom, date et signature</div></td>
            <td><div class="role">Vérifié par (chef de projet)</div><div class="line">Nom, date et signature</div></td>
            <td><div class="role">Approuvé par (direction)</div><div class="line">Nom, date, signature et cachet</div></td>
            <td><div class="role">Le sous-traitant (lu et approuvé)</div><div class="line">Nom, date, signature et cachet</div></td>
        </tr>
    </table>
    <p class="note">Page 1 · fiche établie depuis Hourie à partir des situations approuvées. Imprimé le {{ $date(now()) }}.</p>
</div>
@php
    $current = null;
    $basis = $lastCertified;
    $highlightId = null;
    $detailReference = $subcontract->reference;
@endphp
@include('subcontract-valuations.partials.contract-detail')
</body>
</html>
