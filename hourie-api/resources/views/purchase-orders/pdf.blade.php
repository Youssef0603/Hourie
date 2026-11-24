<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bon de commande {{ $purchaseOrder->number }}</title>
    <style>
        @page { margin: 0; size: A4 portrait; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #10284c; font-family: "Times New Roman", serif; font-size: 10px; }
        .page { position: relative; width: 186mm; padding: 11mm 12mm; background: #fff; }
        .header { position: relative; height: 28mm; margin-bottom: 2mm; }
        .logo { position: absolute; left: 0; top: 0; width: 42mm; height: 18.1mm; }
        .title { position: absolute; left: 57mm; top: 20mm; width: 72mm; margin: 0; color: #14508c; font-size: 17px; line-height: 1; text-align: center; white-space: nowrap; }
        .number { position: absolute; right: 0; top: 19.5mm; color: #a62522; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
        .parties { width: 100%; margin-bottom: 3mm; border-collapse: collapse; table-layout: fixed; }
        .parties td.party { width: 50%; padding: 0 12mm 0 2mm; vertical-align: top; }
        .parties td.party-right { padding-right: 2mm; padding-left: 12mm; }
        .field { width: 100%; height: 5.4mm; border-collapse: collapse; table-layout: fixed; }
        .field th { padding: 0 1.5mm 0 0; text-align: left; vertical-align: middle; white-space: nowrap; }
        .field td { overflow: hidden; padding: 0 0 1mm .5mm; text-align: left; border-bottom: .35mm solid #14508c; vertical-align: middle; white-space: nowrap; }
        .items { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .items th, .items td { height: 4.25mm; padding: .6mm 1.3mm; border: .3mm solid #14508c; vertical-align: middle; }
        .items thead th { height: 9mm; background: #80aad0; text-align: center; font-weight: bold; }
        .items thead th:nth-child(1) { width: 6%; }
        .items thead th:nth-child(2) { width: 11%; }
        .items thead th:nth-child(3) { width: 44%; }
        .items thead th:nth-child(4) { width: 11%; }
        .items thead th:nth-child(5) { width: 14%; }
        .items thead th:nth-child(6) { width: 14%; }
        .items tbody td { height: 4.8mm; }
        .items tbody td:nth-child(1), .items tbody td:nth-child(4) { text-align: center; }
        .items tbody td:nth-child(5), .items tbody td:nth-child(6), .items tfoot td:last-child { text-align: right; white-space: nowrap; }
        .items .c1 { width: 6%; } .items .c2 { width: 11%; } .items .c3 { width: 44%; }
        .items .c4 { width: 11%; } .items .c5 { width: 14%; } .items .c6 { width: 14%; }
        .items tfoot td { height: 5.5mm; }
        .items tfoot .clear { border: 0; }
        .items tfoot th { background: #80aad0; text-align: center; }
        .signatures { position: relative; min-height: 29mm; margin-top: 7mm; }
        .signature-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .signature-table th { width: 32mm; height: 7mm; padding: 0; text-align: left; vertical-align: middle; white-space: nowrap; }
        .signature-table td { height: 7mm; padding: 0 1mm 1mm; text-align: left; border-bottom: .35mm solid #14508c; vertical-align: middle; }
        .stamp { position: absolute; left: 91mm; top: 0; width: 27mm; height: 27mm; object-fit: contain; }
        .footer { margin-top: 4mm; border: .3mm solid #14508c; }
        .footer p { display: table; width: 100%; min-height: 7mm; margin: 0; padding: 0; border-bottom: .3mm solid #14508c; }
        .footer p:last-child { border-bottom: 0; }
        .footer b, .footer span { display: table-cell; height: 7mm; vertical-align: middle; }
        .footer b { width: 32mm; border-right: .3mm solid #14508c; padding: 0 3mm; text-transform: uppercase; }
        .footer span { padding: 0 3mm; }
    </style>
</head>
<body>
@php
    $number = $purchaseOrder->number;
    $formatNumber = static function ($value, bool $forceDecimals = false): string {
        $numberValue = (float) (string) $value;
        $hasDecimals = abs($numberValue - round($numberValue)) > 0.000001;
        return number_format($numberValue, ($forceDecimals || $hasDecimals) ? 2 : 0, ',', ' ');
    };
    $money = static fn ($value): string => $formatNumber($value).' F CFA';
    $items = $purchaseOrder->items->take(20)->values();
@endphp
<div class="page">
    <div class="header">
        <img class="logo" src="{{ $logoDataUri }}" alt="A.R. Hourie Entreprises">
        <h1 class="title">BON DE COMMANDE</h1>
        <div class="number">N° {{ $number }}</div>
    </div>

    <table class="parties">
        <tr>
            <td class="party">
                <table class="field"><tr><th style="width: 13%">À :</th><td>{{ $purchaseOrder->supplier_name }}</td></tr></table>
                <table class="field"><tr><th style="width: 13%">Tél. :</th><td>{{ $purchaseOrder->supplier_phone }}</td></tr></table>
                <table class="field"><tr><th style="width: 13%">Fax :</th><td>{{ $purchaseOrder->supplier_fax }}</td></tr></table>
            </td>
            <td class="party party-right">
                <table class="field"><tr><th style="width: 33%">Date :</th><td>{{ $purchaseOrder->ordered_on?->locale('fr')->translatedFormat('j M Y') }}</td></tr></table>
                <table class="field"><tr><th style="width: 33%">Agent de suivi :</th><td>{{ $purchaseOrder->follow_up_agent }}</td></tr></table>
                <table class="field"><tr><th style="width: 33%">Contact :</th><td>{{ $purchaseOrder->contact_name }}</td></tr></table>
            </td>
        </tr>
    </table>

    <table class="items">
        <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"></colgroup>
        <thead><tr><th>Art.<br>N°</th><th>Code Bud.</th><th>Référence et Description</th><th>Qté</th><th>Prix Unit.</th><th>Total</th></tr></thead>
        <tbody>
        @for ($index = 0; $index < 20; $index++)
            @php $item = $items->get($index); @endphp
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item?->budget_code }}</td>
                <td>{{ $item?->description }}</td>
                <td>{{ $item ? trim($formatNumber($item->quantity).' '.($item->unit ?? '')) : '' }}</td>
                <td>{{ $item ? $money($item->unit_price) : '' }}</td>
                <td>{{ $item ? $money($item->subtotal()) : '' }}</td>
            </tr>
        @endfor
        </tbody>
        <tfoot>
            <tr><td class="clear" colspan="4"></td><th>Total HT</th><td>{{ $money($purchaseOrder->subtotal()) }}</td></tr>
            <tr><td class="clear" colspan="4"></td><th>TVA ({{ $formatNumber($purchaseOrder->vat_rate) }} %)</th><td>{{ $money($purchaseOrder->vatAmount()) }}</td></tr>
            <tr><td class="clear" colspan="4"></td><th>Total TTC</th><td>{{ $money($purchaseOrder->total()) }}</td></tr>
        </tfoot>
    </table>

    <div class="signatures">
        <table class="signature-table">
            <tr><th style="width: 18%">Préparé par :</th><td>{{ $purchaseOrder->prepared_by }}</td></tr>
            <tr><th style="width: 18%">Commandé par :</th><td>{{ $purchaseOrder->ordered_by }}</td></tr>
            <tr><th style="width: 18%">Validé par :</th><td>{{ $purchaseOrder->approved_by }}</td></tr>
        </table>
        <img class="stamp" src="{{ $stampDataUri }}" alt="Cachet">
    </div>

    <div class="footer">
        <p><b>Motif :</b><span>{{ $purchaseOrder->reason }}</span></p>
        <p><b>Projet :</b><span>{{ $purchaseOrder->project_name }}</span></p>
        @if ($purchaseOrder->notes)<p><b>Notes :</b><span>{{ $purchaseOrder->notes }}</span></p>@endif
    </div>
</div>
</body>
</html>
