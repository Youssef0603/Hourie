<?php

namespace App\Enums;

enum EquipmentChangeSource: string
{
    case Import = 'import';
    case Manual = 'manual';
    case Transfer = 'transfer';
    case Maintenance = 'maintenance';
}
