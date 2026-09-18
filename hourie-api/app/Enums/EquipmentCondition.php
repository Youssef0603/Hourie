<?php

namespace App\Enums;

enum EquipmentCondition: string
{
    case Functional = 'functional';
    case Defective = 'defective';
    case BeyondRepair = 'beyond_repair';
}
