<?php

namespace App\Enums;

enum EquipmentImportRowStatus: string
{
    case Pending = 'pending';
    case Imported = 'imported';
    case Skipped = 'skipped';
    case Failed = 'failed';
}
