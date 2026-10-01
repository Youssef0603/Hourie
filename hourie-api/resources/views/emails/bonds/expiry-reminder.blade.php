@php
    $formattedIssueDate = $bond->issued_on?->locale('fr')->translatedFormat('d F Y') ?? 'À compléter';
    $formattedExpiryDate = $bond->expires_on?->locale('fr')->translatedFormat('d F Y') ?? 'À compléter';
    $daysUntilExpiry = $bond->expires_on ? max(0, (int) now()->startOfDay()->diffInDays($bond->expires_on, false)) : null;
    $documentCount = $bond->documents->count();
    $currency = $bond->currency === 'XOF' ? 'FCFA' : $bond->currency;
    $money = fn ($amount) => number_format((float) $amount, 0, ',', ' ').' '.$currency;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Échéance caution — {{ $bond->project->name }}</title>
</head>
<body style="margin:0; padding:0; background:#f5f6f8; color:#18191c; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f5f6f8; padding:32px 16px;">
    <tr><td align="center">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:620px; background:#fff; border:1px solid #e5e6e9; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(24,25,28,.07);">
            <tr><td style="padding:28px 36px; background:#d31245; color:#fff;">
                <div style="font-size:12px; line-height:16px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#fde5ed;">A.R. Hourie Entreprises · Caution</div>
                <div style="padding-top:18px; font-size:28px; line-height:35px; font-weight:700;">Renouvellement à prévoir</div>
                <div style="padding-top:6px; font-size:15px; line-height:22px; color:#fde5ed;">Une caution arrive prochainement à échéance.</div>
            </td></tr>
            <tr><td style="padding:30px 36px 14px; font-size:16px; line-height:24px; color:#383b40;">
                Merci d’engager le renouvellement de cette caution avant sa date d’expiration.
            </td></tr>
            <tr><td style="padding:18px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dedfe3; border-radius:12px; overflow:hidden;">
                    <tr><td colspan="2" style="padding:20px 22px; background:#fff7f9; border-bottom:1px solid #f2d5dd;">
                        <div style="font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#a40e35;">{{ $bond->typeLabel() }}</div>
                        <div style="padding-top:5px; font-size:24px; line-height:30px; font-weight:700;">{{ $bond->project->name }}</div>
                        <div style="padding-top:4px; font-size:14px; color:#65676c;">{{ $bond->location?->name ?? 'Localisation à compléter' }} · {{ $bond->issuer ?: 'Émetteur à compléter' }}</div>
                    </td></tr>
                    <tr>
                        <td width="50%" valign="top" style="padding:18px 11px 8px 22px;"><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#777a80;">Date d’émission</div><div style="padding-top:4px; font-size:15px; font-weight:700;">{{ $formattedIssueDate }}</div></td>
                        <td width="50%" valign="top" style="padding:18px 22px 8px 11px;"><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#a40e35;">Date d’expiration</div><div style="padding-top:4px; font-size:15px; font-weight:700; color:#a40e35;">{{ $formattedExpiryDate }}</div></td>
                    </tr>
                    <tr><td colspan="2" valign="top" style="padding:10px 22px 18px;"><div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#777a80;">Montant de la caution</div><div style="padding-top:4px; font-size:18px; font-weight:700;">{{ $money($bond->amount) }}</div></td></tr>
                </table>
            </td></tr>
            <tr><td style="padding:4px 36px 12px;"><div style="padding:16px 18px; background:#f5f6f8; border-radius:10px; font-size:14px; line-height:21px; color:#4c5056;"><strong style="color:#18191c;">Échéance :</strong> @if ($daysUntilExpiry === 0) la caution expire aujourd’hui. @elseif ($daysUntilExpiry !== null) il reste {{ $daysUntilExpiry }} jour{{ $daysUntilExpiry > 1 ? 's' : '' }} avant l’expiration. @else la date d’expiration doit être vérifiée. @endif</div></td></tr>
            @if ($documentCount > 0)
                <tr><td style="padding:8px 36px 14px;"><div style="padding:14px 16px; border:1px solid #e2e3e6; border-radius:10px; font-size:13px; line-height:20px; color:#65676c;"><strong style="display:block; color:#18191c;">{{ $documentCount }} document{{ $documentCount > 1 ? 's' : '' }} joint{{ $documentCount > 1 ? 's' : '' }}</strong>Les documents associés à cette caution sont joints au rappel.</div></td></tr>
            @endif
            <tr><td style="padding:10px 36px 34px; font-size:14px; line-height:21px; color:#65676c;">Après renouvellement, mettez à jour la date d’expiration et les documents dans Hourie afin d’arrêter les rappels de cette échéance.</td></tr>
        </table>
        <p style="margin:18px 0 0; font-size:12px; color:#777a80;">Message automatique envoyé par Hourie. Merci de ne pas y répondre.</p>
    </td></tr>
</table>
</body>
</html>
