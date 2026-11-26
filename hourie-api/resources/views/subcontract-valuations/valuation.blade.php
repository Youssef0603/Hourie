<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Valuation {{ $valuation->reference }}</title>
    <style>
        @page { margin: 0; size: A4 portrait; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1d2733; font-family: Helvetica, Arial, sans-serif; font-size: 8.2px; }
        .page { width: 186mm; padding: 10mm 12mm 8mm; }
        .page-break { page-break-before: always; }
        .bar { margin: 0; padding: 1.8mm 2.5mm; background: #2c3640; color: #fff; font-size: 11px; font-weight: bold; letter-spacing: .3px; }
        .section { margin: 3.2mm 0 0; padding: 1.3mm 2.5mm; background: #2c3640; color: #fff; font-size: 8.4px; font-weight: bold; letter-spacing: .3px; }
        table { width: 100%; border-collapse: collapse; }
        .head { margin-top: 2mm; table-layout: fixed; }
        .head td { padding: .55mm 1mm; vertical-align: top; }
        .head .k { width: 17mm; color: #44505c; font-weight: bold; }
        .head .rk { color: #44505c; font-weight: bold; text-align: right; }
        .head .rv { width: 30mm; text-align: right; font-weight: bold; }
        .lines { table-layout: auto; }
        .lines th { padding: 1mm 1.2mm; background: #b9cfdc; text-align: left; font-size: 7.8px; }
        .lines td { padding: .75mm 1.2mm; border-bottom: .15mm solid #e1e7ec; vertical-align: middle; }
        .lines .no { width: 9mm; color: #44505c; }
        .lines .rate { width: 16mm; text-align: right; }
        .lines .amt { width: 30mm; text-align: right; white-space: nowrap; }
        .lines .cur { width: 30mm; text-align: right; white-space: nowrap; }
        .lines th.amt, .lines th.cur, .lines th.rate { text-align: right; }
        .lines tr.sub td { background: #d7e5ec; font-weight: bold; }
        .lines tr.strong td { background: #b9d1d9; font-weight: bold; text-transform: uppercase; }
        .lines tr.total td { background: #8db4bf; font-weight: bold; text-transform: uppercase; }
        .lines tr.sizer td { padding: 0; height: 0; border: 0; }
        .input { background: #f3d77a; }
        .muted { color: #6b7783; }
        .grid { table-layout: fixed; }
        .grid th { padding: 1mm 1.2mm; background: #b9cfdc; font-size: 7.4px; text-align: right; }
        .grid th.l, .grid td.l { text-align: left; }
        .grid td { padding: .9mm 1.2mm; border-bottom: .15mm solid #e1e7ec; text-align: right; white-space: nowrap; }
        .grid tr.total td { background: #b9d1d9; font-weight: bold; }
        .grid tr.dark td { background: #2c3640; color: #fff; font-weight: bold; }
        .prepared { margin-top: 4mm; padding: 1.6mm 2.5mm; background: #d7e5ec; font-weight: bold; }
        .dg-title { margin: 0; padding: 2mm 2.5mm; background: #2c3640; color: #fff; }
        .dg-title small { display: block; font-size: 8px; letter-spacing: .3px; }
        .dg-title b { display: block; margin-top: .8mm; font-size: 12px; letter-spacing: .3px; }
        .cols { table-layout: fixed; }
        .cols > tbody > tr > td { vertical-align: top; }
        .kv td { padding: .8mm 1.2mm; border-bottom: .15mm solid #e1e7ec; }
        .kv td.v { text-align: right; white-space: nowrap; font-weight: bold; }
        .kv tr.sub td { background: #d7e5ec; font-weight: bold; }
        .kv .k { color: #44505c; font-weight: bold; font-size: 7.4px; text-transform: uppercase; }
        .boxes td { padding: 2mm; text-align: center; border: .4mm solid #fff; background: #d7e5ec; }
        .boxes td.input { background: #f3d77a; }
        .boxes .k { display: block; font-size: 7.2px; letter-spacing: .3px; color: #44505c; }
        .boxes .v { display: block; margin-top: 1.5mm; font-size: 12px; font-weight: bold; }
        .visa td { padding: 1.5mm 1.2mm; vertical-align: bottom; }
        .sign-line { display: inline-block; width: 52mm; border-bottom: .25mm solid #1d2733; height: 9mm; }
        .note { margin-top: 1.2mm; color: #44505c; font-size: 7.4px; }
        .red { color: #a62522; font-weight: bold; }
    </style>
</head>
<body>
@php
    $l = $statement['lines'];
    $n = static fn ($value): float => (float) (string) $value;
    $blank ??= false;
    $money = static function ($value) use ($n): string {
        if ($value === null) {
            return '';
        }
        $amount = $n($value);
        if (abs($amount) < 0.005) {
            return '-';
        }

        return ($amount < 0 ? '-' : '').number_format(abs($amount), abs($amount - round($amount)) > 0.004 ? 2 : 0, ',', ' ');
    };
    $rate = static fn ($value): string => number_format((float) (string) $value, 1, ',', ' ').'%';
    $date = static fn ($value): string => $value ? \Carbon\Carbon::parse($value)->locale('en')->format('j M Y') : '';
    $currency = $subcontract->currency === 'XOF' ? 'FCFA' : $subcontract->currency;
    $project = mb_strtoupper($subcontract->project->name);
    $subcontractor = mb_strtoupper($subcontract->subcontractor->name);
    $number = str_pad((string) $valuation->sequence, 2, '0', STR_PAD_LEFT);
    $hasCurrent = ! $valuation->isAdvance();
    $status = $statement['passes'] === null ? '' : ($statement['passes'] ? 'READY' : 'À VÉRIFIER');
    $minus = static fn ($left, $right) => $left === null || $right === null ? null : $left->minus($right);
    $plus = static fn ($left, $right) => $left === null || $right === null ? null : $left->plus($right);
    $row = static fn (string $line, string $label, string $class = '', ?string $rateValue = null, bool $input = false, $currentValue = null): array => compact('line', 'label', 'class', 'rateValue', 'input', 'currentValue');
    $sectionA = [
        $row('01', 'Works executed, original scope (cumulative)', '', null, true, $statement['current']['01']),
        $row('02', 'Variations executed (cumulative)', '', null, true, $statement['current']['02']),
        $row('03', 'Materials on site (cumulative)', '', null, true, $statement['current']['03']),
        $row('03A', 'Unclassified historical works (cumulative)', '', null, true, $statement['current']['03A']),
        $row('04', 'Cumulative total works executed', 'sub'),
        $row('05', 'Claims and other works (cumulative)', '', null, true, $statement['current']['05']),
        $row('06', 'Cumulative gross works incl claims', 'sub'),
        $row('07', 'Less previously certified gross works'),
        $row('08', 'Current gross works executed', 'strong'),
        $row('09', 'Less advance payment recovery', '', $rate($subcontract->advance_recovery_rate)),
        $row('10', 'Subtotal after advance recovery', 'sub'),
        $row('11', 'Less current retention', '', $rate($subcontract->retention_rate)),
        $row('12', 'Add retention released', '', null, true),
        $row('13', 'Net certified before adjustments', 'sub'),
        $row('14', 'Add VAT on certificate (0% default)', '', '-', true),
        $row('15', 'Less previously accounted VAT', '', null, true),
        $row('16', 'Less materials previously paid', '', null, true),
        $row('17', 'Less other certified deductions', '', null, true),
        $row('18', 'Net certified this valuation, excl VAT tracker', 'total'),
    ];
@endphp

{{-- Page 1 · DG synthesis, on top as the PM files it --}}
@php
    $selected = $statement['selected'];
    $prior = $statement['prior'];
    $cumulative = $statement['cumulative'];
    $channelLabels = ['cash' => 'Espèces', 'cheque' => 'Chèque', 'vat' => 'TVA'];
@endphp
<div class="page">
    <div class="dg-title"><small>{{ $project }} / {{ $subcontractor }}</small><b>SYNTHÈSE FINANCIÈRE | VALIDATION DIRECTION GÉNÉRALE</b></div>

    <table class="cols" style="margin-top: 3mm">
        <tr>
            <td style="padding-right: 3mm">
                <table class="kv">
                    <tr><td class="k">Décompte à examiner</td><td class="k" style="text-align: right">N° de projet</td><td class="v">{{ $subcontract->project->code }}</td></tr>
                    <tr><td>Numéro du décompte</td><td></td><td class="v input" style="text-align: center">{{ (int) $valuation->sequence }}</td></tr>
                    <tr><td>Statut du décompte</td><td></td><td class="v">{{ $status }}</td></tr>
                </table>
            </td>
            <td style="padding-left: 3mm">
                <table class="kv">
                    <tr><td class="k">Sous-traitant</td><td class="v">{{ $subcontractor }}</td></tr>
                    <tr><td>Date du décompte</td><td class="v">{{ $date($valuation->valuation_date) }}</td></tr>
                    <tr><td>Traitement TVA</td><td class="v red">CONFIRMÉ</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="cols">
        <tr>
            <td style="padding-right: 3mm">
                <div class="section">1 | CERTIFICAT SÉLECTIONNÉ</div>
                <table class="kv">
                    <tr><td>Travaux exécutés bruts (HT)</td><td class="v">{{ $money($l['08']) }}</td></tr>
                    <tr><td>Récupération d’avance</td><td class="v">{{ $money($l['09']) }}</td></tr>
                    <tr><td>Retenue nette du décompte</td><td class="v">{{ $money($minus($l['11'], $l['12'])) }}</td></tr>
                    <tr class="sub"><td>NET CERTIFIÉ (HT)</td><td class="v">{{ $money($l['18']) }}</td></tr>
                    <tr><td>Paiements constatés (HT)</td><td class="v">{{ $money($l['33']) }}</td></tr>
                    <tr class="sub"><td>RESTE À PAYER (HT)</td><td class="v">{{ $money($l['36']) }}</td></tr>
                </table>
            </td>
            <td style="padding-left: 3mm">
                <div class="section">2 | SITUATION FINANCIÈRE CUMULÉE</div>
                <table class="kv">
                    <tr><td>Certifié HT, avance comprise</td><td class="v">{{ $money($l['42']) }}</td></tr>
                    <tr><td>Payé HT, avance comprise</td><td class="v">{{ $money($plus($l['43'], $l['44'])) }}</td></tr>
                    <tr class="sub"><td>RESTE GLOBAL HT</td><td class="v">{{ $money($l['45']) }}</td></tr>
                    <tr><td>Avance restant à récupérer</td><td class="v">{{ $money($l['49']) }}</td></tr>
                    <tr><td>Retenue de garantie cumulée</td><td class="v">{{ $money($l['50']) }}</td></tr>
                    <tr class="sub"><td>Contrôle de cohérence</td><td class="v">{{ $status }}</td></tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="section">3 | VENTILATION DES PAIEMENTS • DÉCOMPTE SÉLECTIONNÉ / CUMUL À DATE</div>
    <table class="grid">
        <thead><tr><th class="l">Mode de règlement</th><th>Prévu ({{ $currency }})</th><th>Payé ({{ $currency }})</th><th>Reste ({{ $currency }})</th><th>Prévu cumulé</th><th>Payé cumulé</th><th>Reste cumulé</th></tr></thead>
        <tbody>
            @foreach (['cash' => 'ESPÈCES (HT)', 'cheque' => 'CHÈQUE (HT)', 'vat' => 'TVA SUIVIE'] as $channel => $label)
                <tr>
                    <td class="l">{{ $label }}</td>
                    <td>{{ $money($selected[$channel]['due']) }}</td><td>{{ $money($selected[$channel]['paid']) }}</td><td>{{ $money($selected[$channel]['balance']) }}</td>
                    <td>{{ $money($cumulative[$channel]['due']) }}</td><td>{{ $money($cumulative[$channel]['paid']) }}</td><td><b>{{ $money($cumulative[$channel]['balance']) }}</b></td>
                </tr>
            @endforeach
            <tr class="dark">
                <td class="l">TOTAL SUIVI (HT + TVA)</td>
                <td>{{ $money($selected['total']['due']) }}</td><td>{{ $money($selected['total']['paid']) }}</td><td>{{ $money($selected['total']['balance']) }}</td>
                <td>{{ $money($cumulative['total']['due']) }}</td><td>{{ $money($cumulative['total']['paid']) }}</td><td>{{ $money($cumulative['total']['balance']) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section">4 | RESTES À RÉGLER SELON LES COMPTES DU DÉCOMPTE SÉLECTIONNÉ</div>
    <table class="boxes" style="table-layout: fixed">
        <tr>
            <td><span class="k">ESPÈCES RESTANTES</span><span class="v">{{ $money($selected['cash']['balance']) }}</span></td>
            <td><span class="k">CHÈQUE RESTANT</span><span class="v">{{ $money($selected['cheque']['balance']) }}</span></td>
            <td class="input"><span class="k">TVA RESTANTE</span><span class="v">{{ $money($selected['vat']['balance']) }}</span></td>
            <td><span class="k">SOLDE SUIVI TOTAL</span><span class="v">{{ $money($selected['total']['balance']) }}</span></td>
        </tr>
    </table>

    <div class="section">5 | VISA ET DÉCISION DE RÈGLEMENT</div>
    <p class="note">Montants présentés pour validation. La certification ne vaut pas ordre de paiement.</p>
    <table class="visa">
        <tr><td style="width: 50%">Visa / date : <span class="sign-line"></span></td><td></td></tr>
        <tr><td><b>DIRECTION GÉNÉRALE | SIGNATURE :</b> <span class="sign-line" style="width: 38mm"></span></td><td><b>DATE :</b> <span class="sign-line" style="width: 45mm"></span></td></tr>
    </table>

    <div class="section">6 | DETTE ANTÉRIEURE ET MONTANTS À APPROUVER</div>
    <table class="grid">
        <thead><tr><th class="l">Paiement</th><th>Prévu avant</th><th>Payé avant</th><th>Reste avant</th><th>Prévu déc.</th><th>Payé déc.</th><th>Reste déc.</th><th>Reste global</th></tr></thead>
        <tbody>
            @foreach (['cash' => 'Espèces', 'cheque' => 'Chèque', 'vat' => 'TVA', 'total' => 'TOTAL'] as $channel => $label)
                <tr class="{{ $channel === 'total' ? 'total' : '' }}">
                    <td class="l">{{ $label }}</td>
                    <td>{{ $money($prior[$channel]['due']) }}</td><td>{{ $money($prior[$channel]['paid']) }}</td><td>{{ $money($prior[$channel]['balance']) }}</td>
                    <td>{{ $money($selected[$channel]['due']) }}</td><td>{{ $money($selected[$channel]['paid']) }}</td><td>{{ $money($selected[$channel]['balance']) }}</td>
                    <td><b>{{ $money($cumulative[$channel]['balance']) }}</b></td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
{{-- Page 2 · A, B, C and the start of D --}}
<div class="page page-break">
    <div class="bar">SUBCONTRACTOR VALUATION | {{ $project }} | {{ $subcontractor }} | NO. {{ $number }}</div>
    <table class="head">
        <tr>
            <td class="k">Project</td><td>{{ $project }}</td>
            <td class="rk">Valuation number</td><td class="rv">{{ $number }}</td>
        </tr>
        <tr>
            <td class="k">Subcontractor</td><td>{{ $subcontractor }}</td>
            <td class="rk">Valuation date</td><td class="rv input">{{ $date($valuation->valuation_date) }}</td>
        </tr>
        <tr>
            <td class="k">Employer</td><td>{{ $subcontract->employer_name ? mb_strtoupper($subcontract->employer_name) : '' }}</td>
            <td class="rk">Project code</td><td class="rv">{{ $subcontract->project->code }}</td>
        </tr>
        <tr>
            <td class="k">Engineer</td><td>{{ $subcontract->engineer_name ? mb_strtoupper($subcontract->engineer_name) : '' }}</td>
            <td class="rk">Advance paid</td><td class="rv">{{ $money($l['19']) }}</td>
        </tr>
        <tr>
            <td class="k">Scope</td><td>{{ mb_strtoupper($subcontract->title) }}</td>
            <td class="rk">Original contract</td><td class="rv">{{ $money($statement['original_contract']) }}</td>
        </tr>
        <tr>
            <td class="k">Currency</td><td>{{ $currency }}</td>
            <td class="rk">Revised contract</td><td class="rv">{{ $money($statement['revised_contract']) }}</td>
        </tr>
    </table>

    <div class="section">A | VALUATION STATUS</div>
    <table class="lines">
        <thead><tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr><tr><th class="no">Line</th><th>Description</th><th class="rate">Rate</th><th class="amt">Cumulative / net</th><th class="cur">Add / enter current</th></tr></thead>
        <tbody>
            @foreach ($sectionA as $item)
                <tr class="{{ $item['class'] }}">
                    <td class="no">{{ $item['line'] }}</td>
                    <td>{{ $item['label'] }}</td>
                    <td class="rate">{{ $item['rateValue'] }}</td>
                    <td class="amt">{{ $money($l[$item['line']]) }}</td>
                    <td class="cur {{ $item['input'] ? 'input' : '' }}">{{ $item['currentValue'] !== null && $hasCurrent ? ($n($item['currentValue']) == 0 ? '' : $money($item['currentValue'])) : '' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section">B | ADVANCE PAYMENT STATUS</div>
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            <tr><td class="no">19</td><td>Initial advance payment received</td><td class="rate"></td><td class="amt">{{ $money($l['19']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">20</td><td>Advance recovered, previous valuations</td><td class="rate"></td><td class="amt">{{ $money($l['20']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">21</td><td>Advance recovered, cumulative</td><td class="rate"></td><td class="amt">{{ $money($l['21']) }}</td><td class="cur"></td></tr>
            <tr class="strong"><td class="no">22</td><td>Advance remaining to recover</td><td class="rate"></td><td class="amt">{{ $money($l['22']) }}</td><td class="cur"></td></tr>
        </tbody>
    </table>

    <div class="section">C | RETENTION STATUS</div>
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            <tr><td class="no">23</td><td>Retention balance brought forward</td><td class="rate"></td><td class="amt">{{ $money($l['23']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">24</td><td>Retention withheld this valuation</td><td class="rate"></td><td class="amt">{{ $money($l['24']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">25</td><td>Retention released this valuation</td><td class="rate"></td><td class="amt">{{ $money($l['25']) }}</td><td class="cur"></td></tr>
            <tr class="strong"><td class="no">26</td><td>Retention held after this valuation</td><td class="rate"></td><td class="amt">{{ $money($l['26']) }}</td><td class="cur"></td></tr>
        </tbody>
    </table>

    <div class="section">D | PAYMENT STATUS</div>
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            <tr class="strong"><td class="no">27</td><td>Net certified, excluding VAT</td><td class="rate"></td><td class="amt">{{ $money($l['27']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">28</td><td>Cash allocation (% of certification)</td><td class="rate"></td><td class="amt">{{ $rate($valuation->cash_percent) }}</td><td class="cur input">{{ $rate($valuation->cash_percent) }}</td></tr>
        </tbody>
    </table>
</div>

{{-- Page 3 · end of D, E, F and G --}}
<div class="page page-break">
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            <tr><td class="no">29</td><td>Planned cash payment</td><td class="rate"></td><td class="amt">{{ $money($l['29']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">30</td><td>Planned cheque payment</td><td class="rate"></td><td class="amt">{{ $money($l['30']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">31</td><td>Cash actually paid</td><td class="rate"></td><td class="amt">{{ $money($l['31']) }}</td><td class="cur input"></td></tr>
            <tr><td class="no">32</td><td>Cheque actually paid</td><td class="rate"></td><td class="amt">{{ $money($l['32']) }}</td><td class="cur input"></td></tr>
            <tr class="sub"><td class="no">33</td><td>TOTAL ACTUAL PAID, EXCL VAT</td><td class="rate"></td><td class="amt">{{ $money($l['33']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">34</td><td>Cash outstanding against planned</td><td class="rate"></td><td class="amt">{{ $money($l['34']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">35</td><td>Cheque outstanding against planned</td><td class="rate"></td><td class="amt">{{ $money($l['35']) }}</td><td class="cur"></td></tr>
            <tr class="strong"><td class="no">36</td><td>Total outstanding, excl VAT</td><td class="rate"></td><td class="amt red">{{ $money($l['36']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">37</td><td>Expected VAT on planned cheque</td><td class="rate"></td><td class="amt">{{ $money($l['37']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">38</td><td>VAT actually paid</td><td class="rate"></td><td class="amt">{{ $money($l['38']) }}</td><td class="cur input"></td></tr>
            <tr class="sub"><td class="no">39</td><td>OUTSTANDING VAT</td><td class="rate"></td><td class="amt">{{ $money($l['39']) }}</td><td class="cur"></td></tr>
            <tr class="total"><td class="no">40</td><td>Total outstanding incl tracked VAT</td><td class="rate"></td><td class="amt">{{ $money($l['40']) }}</td><td class="cur"></td></tr>
        </tbody>
    </table>

    <div class="section">E | CUMULATIVE FINANCIAL STATUS</div>
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            <tr><td class="no">41</td><td>Cumulative certified work net</td><td class="rate"></td><td class="amt">{{ $money($l['41']) }}</td><td class="cur"></td></tr>
            <tr class="sub"><td class="no">42</td><td>Cumulative payable incl initial advance</td><td class="rate"></td><td class="amt">{{ $money($l['42']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">43</td><td>Cumulative actual cash paid incl advance</td><td class="rate"></td><td class="amt">{{ $money($l['43']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">44</td><td>Cumulative actual cheque paid incl advance</td><td class="rate"></td><td class="amt">{{ $money($l['44']) }}</td><td class="cur"></td></tr>
            <tr class="strong"><td class="no">45</td><td>Cumulative unpaid, excl VAT</td><td class="rate"></td><td class="amt">{{ $money($l['45']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">46</td><td>Cumulative VAT expected incl advance</td><td class="rate"></td><td class="amt">{{ $money($l['46']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">47</td><td>Cumulative VAT actually paid incl advance</td><td class="rate"></td><td class="amt">{{ $money($l['47']) }}</td><td class="cur"></td></tr>
            <tr class="sub"><td class="no">48</td><td>CUMULATIVE VAT BALANCE</td><td class="rate"></td><td class="amt">{{ $money($l['48']) }}</td><td class="cur"></td></tr>
            <tr><td class="no">49</td><td>Outstanding advance recovery</td><td class="rate"></td><td class="amt">{{ $money($l['49']) }}</td><td class="cur"></td></tr>
            <tr class="sub"><td class="no">50</td><td>Cumulative retention held</td><td class="rate"></td><td class="amt">{{ $money($l['50']) }}</td><td class="cur"></td></tr>
        </tbody>
    </table>

    <div class="section">F | RECONCILIATION AND ASSUMPTION CHECKS</div>
    <table class="lines">
        <tbody>
            <tr class="sizer"><td style="width: 10mm"></td><td style="width: 80mm"></td><td style="width: 16mm"></td><td style="width: 32mm"></td><td style="width: 32mm"></td></tr>
            @foreach ([
                '51' => 'Gross to net certification check', '52' => 'Advance roll-forward check', '53' => 'Retention roll-forward check',
                '54' => 'Certificate vs paid/unpaid check', '55' => 'Cash/cheque allocation check', '56' => 'VAT paid/expected balance check',
                '57' => 'Cumulative works payment check', '58' => 'Cumulative VAT payment check',
            ] as $line => $label)
                <tr><td class="no">{{ $line }}</td><td>{{ $label }}</td><td class="rate"></td><td class="amt">{{ $money($statement['checks'][$line]) }}</td><td class="cur"></td></tr>
            @endforeach
            <tr class="strong"><td class="no">59</td><td>Arithmetic reconciliation only</td><td class="rate"></td><td class="amt">{{ $statement['passes'] === null ? '' : ($statement['passes'] ? 'PASS' : 'CHECK') }}</td><td class="cur"></td></tr>
            <tr><td class="no">60</td><td>VAT policy verification</td><td class="rate"></td><td class="amt">CONFIRMED</td><td class="cur"></td></tr>
            <tr><td class="no">61</td><td>Valuation entry status</td><td class="rate"></td><td class="amt">{{ $blank ? '' : ($valuation->isCertified() ? 'VALUED' : 'DRAFT') }}</td><td class="cur"></td></tr>
            <tr><td class="no">62</td><td>Historical evidence</td><td class="rate"></td><td class="amt">{{ $valuation->documents->isNotEmpty() ? 'ATTACHED' : 'FUTURE INPUT' }}</td><td class="cur"></td></tr>
        </tbody>
    </table>

    <div class="section">G | CUMULATIVE PAYMENT HISTORY | FOR THIS CERTIFICATE</div>
    <table class="grid">
        <thead><tr><th class="l">Ref</th><th>Net payable</th><th>Actual paid HT</th><th>Outstanding HT</th></tr></thead>
        <tbody>
            @foreach (['advance' => 'Advance', 'prior' => 'Prior works', 'current' => 'Current certificate'] as $key => $label)
                <tr><td class="l">{{ $label }}</td><td>{{ $money($statement['history'][$key]['net']) }}</td><td>{{ $money($statement['history'][$key]['paid']) }}</td><td>{{ $money($statement['history'][$key]['outstanding']) }}</td></tr>
            @endforeach
            <tr class="total"><td class="l">TOTAL</td><td>{{ $money($statement['history']['total']['net']) }}</td><td>{{ $money($statement['history']['total']['paid']) }}</td><td>{{ $money($statement['history']['total']['outstanding']) }}</td></tr>
        </tbody>
    </table>

    <div class="prepared">PREPARED / CHECKED: <span class="sign-line" style="width: 70mm; height: 4mm"></span></div>
</div>

</body>
</html>
