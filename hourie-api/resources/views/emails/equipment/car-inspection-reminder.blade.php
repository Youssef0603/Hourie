@php
    $vehicleName = trim(($car->brand ?? '').' '.($car->model ?? '')) ?: 'Véhicule à compléter';
    $inspectionDate = $car->asset_details['inspection_date'] ?? null;
    $formattedInspectionDate = $inspectionDate ? \Carbon\CarbonImmutable::parse($inspectionDate)->locale('fr')->translatedFormat('d F Y') : 'À compléter';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Rappel de visite — {{ $car->asset_code }}</title>
</head>
<body style="margin:0; padding:0; background:#f5f6f8; color:#18191c; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f5f6f8; padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;">
                <tr>
                    <td style="padding:28px 36px; background:#d31245; color:#ffffff;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="font-size:12px; line-height:16px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#fde5ed;">A.R. Hourie Entreprises</td>
                                <td align="right" style="font-size:22px; line-height:22px;">▣</td>
                            </tr>
                        </table>
                        <div style="padding-top:18px; font-size:28px; line-height:34px; font-weight:700;">Rappel de visite</div>
                        <div style="padding-top:6px; font-size:15px; line-height:22px; color:#fde5ed;">Une visite de véhicule approche.</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:32px 36px 12px;">
                        <p style="margin:0; font-size:16px; line-height:24px; color:#383b40;">Bonjour,</p>
                        <p style="margin:12px 0 0; font-size:16px; line-height:24px; color:#383b40;">La visite du véhicule ci-dessous est à prévoir. Merci de planifier son renouvellement avant l’échéance.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:20px 36px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dcdde1; border-radius:12px; overflow:hidden;">
                            <tr>
                                <td style="padding:20px 22px; background:#fff7f9; border-bottom:1px solid #f3d3dc;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td style="font-size:12px; line-height:16px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#a40e35;">Véhicule concerné</td>
                                            <td align="right" style="font-size:13px; line-height:18px; font-weight:700; color:#a40e35;">{{ $car->asset_code }}</td>
                                        </tr>
                                    </table>
                                    <div style="padding-top:7px; font-size:21px; line-height:28px; font-weight:700; color:#18191c;">{{ $vehicleName }}</div>
                                    <div style="padding-top:4px; font-size:14px; line-height:20px; color:#65676c;">Immatriculation : {{ $car->serial_number ?: 'À compléter' }}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:4px 22px 18px;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-right:12px;">
                                                <div style="font-size:12px; line-height:18px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#777a80;">◷ Date de visite</div>
                                                <div style="padding-top:4px; font-size:16px; line-height:22px; font-weight:700; color:#18191c;">{{ $formattedInspectionDate }}</div>
                                            </td>
                                            <td width="50%" valign="top" style="padding-top:16px; padding-left:12px;">
                                                <div style="font-size:12px; line-height:18px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#777a80;">● Conducteur attribué</div>
                                                <div style="padding-top:4px; font-size:16px; line-height:22px; font-weight:700; color:#18191c;">{{ $car->custodian?->name ?? 'Non attribué' }}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 36px 34px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f6f8; border-radius:10px;">
                            <tr>
                                <td style="padding:16px 18px; font-size:14px; line-height:21px; color:#4c5056;"><strong style="color:#18191c;">À faire :</strong> mettez à jour la date de visite dans Hourie dès que le contrôle est renouvelé afin d’arrêter les rappels.</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <p style="margin:18px 0 0; font-size:12px; line-height:18px; color:#777a80;">Message automatique envoyé par Hourie. Merci de ne pas y répondre.</p>
        </td>
    </tr>
</table>
</body>
</html>
