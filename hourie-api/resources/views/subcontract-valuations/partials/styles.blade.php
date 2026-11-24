    <style>
        @page { margin: 0; size: A4 portrait; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #10284c; font-family: Helvetica, Arial, sans-serif; font-size: 8.5px; }
        .page { position: relative; width: 186mm; padding: 9mm 12mm 8mm; }
        .page-break { page-break-before: always; }
        .small-header { position: relative; height: 13mm; border-bottom: .35mm solid #14508c; margin-bottom: 3mm; }
        .small-header img { position: absolute; left: 0; top: 0; width: 24mm; height: 10.3mm; }
        .small-header .t { position: absolute; right: 0; top: 1mm; text-align: right; }
        .small-header .t b { display: block; color: #14508c; font-size: 12px; }
        .small-header .t span { color: #a62522; font-size: 9px; font-weight: bold; }
        .grid tr.current td { background: #fff6da; }
        .header { position: relative; height: 22mm; }
        .logo { position: absolute; left: 0; top: 0; width: 38mm; height: 16.4mm; }
        .title { position: absolute; right: 0; top: 0; text-align: right; }
        .title h1 { margin: 0; color: #14508c; font-size: 16px; letter-spacing: .5px; }
        .title .number { margin-top: 1.5mm; color: #a62522; font-size: 13px; font-weight: bold; }
        .title .status { margin-top: 1mm; font-size: 8px; color: #5b6b82; text-transform: uppercase; letter-spacing: .4px; }
        .draft { margin: 0 0 2.5mm; padding: 1.6mm 3mm; border: .3mm solid #c08a00; background: #fff6da; color: #7a5600; font-weight: bold; text-align: center; }
        .info { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 3mm; }
        .info td { padding: 1.1mm 2mm; border: .25mm solid #c8d4e3; vertical-align: top; }
        .info .label { display: block; color: #5b6b82; font-size: 7px; text-transform: uppercase; letter-spacing: .3px; }
        .info .value { display: block; margin-top: .4mm; font-size: 9px; font-weight: bold; }
        h2 { margin: 3mm 0 1.4mm; padding: 1.2mm 2mm; background: #14508c; color: #fff; font-size: 8.5px; letter-spacing: .5px; text-transform: uppercase; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .grid th, .grid td { padding: 1mm 1.2mm; border: .25mm solid #9fb3cc; vertical-align: middle; }
        .grid thead th { background: #dde8f4; font-size: 7.4px; text-align: center; }
        .grid td.num, .grid th.num { text-align: right; white-space: nowrap; }
        .grid tfoot td, .grid tfoot th { background: #eef3f9; font-weight: bold; }
        .muted { color: #5b6b82; font-size: 7.4px; }
        .calc { width: 100%; border-collapse: collapse; }
        .calc td { padding: .9mm 2mm; border-bottom: .2mm solid #d8e1ec; }
        .calc td.num { text-align: right; white-space: nowrap; width: 38mm; }
        .calc tr.sub td { background: #f2f6fb; font-weight: bold; }
        .calc tr.total td { background: #14508c; color: #fff; font-weight: bold; font-size: 9.5px; }
        .calc tr.indent td.label { padding-left: 5mm; color: #33465f; }
        .signatures { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 4mm; }
        .signatures td { height: 24mm; padding: 1.5mm 2mm; border: .25mm solid #9fb3cc; vertical-align: top; }
        .signatures .role { color: #5b6b82; font-size: 7px; text-transform: uppercase; letter-spacing: .3px; }
        .signatures .line { margin-top: 15mm; color: #5b6b82; font-size: 7px; }
        .note { margin-top: 2mm; color: #5b6b82; font-size: 7.2px; }
        .comment { margin-top: 2mm; padding: 1.5mm 2mm; border: .25mm solid #c8d4e3; }
    </style>
