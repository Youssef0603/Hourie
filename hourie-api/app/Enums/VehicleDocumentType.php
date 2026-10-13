<?php

namespace App\Enums;

enum VehicleDocumentType: string
{
    case RegistrationCard = 'registration_card';
    case TechnicalInspection = 'technical_inspection';
    case InsuranceCertificate = 'insurance_certificate';
    case Other = 'other';
}
