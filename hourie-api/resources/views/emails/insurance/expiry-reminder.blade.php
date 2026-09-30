@php
    $formattedStartDate = $policy->starts_on?->locale('fr')->translatedFormat('d F Y') ?? 'À compléter';
    $formattedEndDate = $policy->ends_on?->locale('fr')->translatedFormat('d F Y') ?? 'À compléter';
    $daysUntilExpiry = $policy->ends_on ? max(0, (int) now()->startOfDay()->diffInDays($policy->ends_on, false)) : null;
    $documentCount = $policy->documents->count();
    $covered = match ($policy->insurance_type) {
        'equipment' => $policy->equipment->count().' actif'.($policy->equipment->count() > 1 ? 's' : '').' couvert'.($policy->equipment->count() > 1 ? 's' : ''),
        'group_health', 'individual_accident' => $policy->employees->count().' personne'.($policy->employees->count() > 1 ? 's' : '').' couverte'.($policy->employees->count() > 1 ? 's' : ''),
        default => $policy->project?->name ?? $policy->insured_situation ?? 'À compléter',
    };
    $formattedTotal = $policy->total_amount !== null
        ? number_format((float) $policy->total_amount, 0, ',', ' ').' FCFA'
        : 'À compléter';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Échéance assurance — Police {{ $policy->policy_number }}</title>
</head>
<body style="margin:0; padding:0; background:#f5f6f8; color:#18191c; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f5f6f8; padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:620px; background:#ffffff; border:1px solid #e5e6e9; border-radius:16px; overflow:hidden; box-shadow:0 12px 34px rgba(24,25,28,.07);">
                <tr>
                    <td style="padding:28px 36px; background:#d31245; color:#ffffff;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="font-size:12px; line-height:16px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#fde5ed;">A.R. Hourie Entreprises</td>
                                <td align="right"><span style="display:inline-block; border:1px solid rgba(255,255,255,.45); border-radius:999px; padding:6px 11px; font-size:11px; line-height:15px; font-weight:700; color:#ffffff;">{{ $categoryLabel }}</span></td>
                            </tr>
                        </table>
                        <div style="padding-top:18px; font-size:28px; line-height:35px; font-weight:700;">Renouvellement à prévoir</div>
                        <div style="padding-top:6px; font-size:15px; line-height:22px; color:#fde5ed;">Une police d’assurance arrive prochainement à échéance.</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:30px 36px 14px;">
                        <p style="margin:0; font-size:16px; line-height:24px; color:#383b40;">Bonjour,</p>
                        <p style="margin:10px 0 0; font-size:16px; line-height:24px; color:#383b40;">Merci d’engager le renouvellement de cette assurance avant sa date d’expiration.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:18px 36px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dedfe3; border-radius:12px; overflow:hidden;">
                            <tr>
                                <td style="padding:20px 22px; background:#fff7f9; border-bottom:1px solid #f2d5dd;">
                                    <div style="font-size:11px; line-height:16px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#a40e35;">Numéro de police</div>
                                    <div style="padding-top:5px; font-size:24px; line-height:30px; font-weight:700; color:#18191c;">{{ $policy->policy_number }}</div>
                                    <div style="padding-top:4px; font-size:14px; line-height:20px; color:#65676c;">{{ $categoryLabel }} · {{ $policy->source ?: 'Assureur à compléter' }}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:4px 22px 20px;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-right:12px;">
                                                <div style="font-size:11px; line-height:17px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#777a80;">Date de début</div>
                                                <div style="padding-top:4px; font-size:15px; line-height:22px; font-weight:700; color:#18191c;">{{ $formattedStartDate }}</div>
                                            </td>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-left:12px;">
                                                <div style="font-size:11px; line-height:17px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#a40e35;">Date d’expiration</div>
                                                <div style="padding-top:4px; font-size:15px; line-height:22px; font-weight:700; color:#a40e35;">{{ $formattedEndDate }}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-right:12px;">
                                                <div style="font-size:11px; line-height:17px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#777a80;">Éléments couverts</div>
                                                <div style="padding-top:4px; font-size:15px; line-height:22px; font-weight:700; color:#18191c;">{{ $covered }}</div>
                                            </td>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-left:12px;">
                                                <div style="font-size:11px; line-height:17px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#777a80;">Prime TTC</div>
                                                <div style="padding-top:4px; font-size:15px; line-height:22px; font-weight:700; color:#18191c;">{{ $formattedTotal }}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:4px 36px 12px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f6f8; border-radius:10px;">
                            <tr>
                                <td style="padding:16px 18px; font-size:14px; line-height:21px; color:#4c5056;">
                                    <strong style="color:#18191c;">Échéance :</strong>
                                    @if ($daysUntilExpiry === 0)
                                        la police expire aujourd’hui.
                                    @elseif ($daysUntilExpiry !== null)
                                        il reste {{ $daysUntilExpiry }} jour{{ $daysUntilExpiry > 1 ? 's' : '' }} avant l’expiration.
                                    @else
                                        la date d’expiration doit être vérifiée.
                                    @endif
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                @if ($documentCount > 0)
                    <tr>
                        <td style="padding:8px 36px 14px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e3e6; border-radius:10px;">
                                <tr>
                                    <td width="42" align="center" style="padding:14px 0 14px 14px; font-size:20px; color:#d31245;">▤</td>
                                    <td style="padding:14px 16px; font-size:13px; line-height:20px; color:#65676c;"><strong style="display:block; color:#18191c;">Document{{ $documentCount > 1 ? 's' : '' }} joint{{ $documentCount > 1 ? 's' : '' }} ({{ $documentCount }})</strong>Le{{ $documentCount > 1 ? 's documents associés sont joints' : ' document associé est joint' }} à ce rappel.</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                @endif
                <tr>
                    <td style="padding:10px 36px 34px;">
                        <p style="margin:0; font-size:14px; line-height:21px; color:#65676c;">Après renouvellement, mettez à jour la date d’expiration et les documents dans Hourie afin d’arrêter les rappels de cette échéance.</p>
                    </td>
                </tr>
            </table>
            <p style="margin:18px 0 0; font-size:12px; line-height:18px; color:#777a80;">Message automatique envoyé par Hourie. Merci de ne pas y répondre.</p>
        </td>
    </tr>
</table>
</body>
</html>
