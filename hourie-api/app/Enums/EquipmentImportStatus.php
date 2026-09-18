<?php

namespace App\Enums;

enum EquipmentImportStatus: string
{
    case Pending = 'pending';
    case Validated = 'validated';
    case Completed = 'completed';
    case Failed = 'failed';
}
