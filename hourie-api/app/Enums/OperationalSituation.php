<?php

namespace App\Enums;

enum OperationalSituation: string
{
    case InUse = 'in_use';
    case InReserve = 'in_reserve';
    case UnderMaintenance = 'under_maintenance';
    case OutOfService = 'out_of_service';
}
