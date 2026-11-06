<?php

namespace App\Enums;

enum EquipmentCondition: string
{
    case Good = 'good';
    case ToMonitor = 'to_monitor';
    case Defective = 'defective';
    case OutOfService = 'out_of_service';
}
