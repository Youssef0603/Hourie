<?php

namespace App\Enums;

enum UserRole: string
{
    case Manager = 'manager';
    case GeneratorManager = 'generator_manager';
    case Viewer = 'viewer';

    public function canManageEquipment(): bool
    {
        return in_array($this, [self::Manager, self::GeneratorManager], true);
    }

    public function canDeleteMaintenance(): bool
    {
        return $this === self::Manager;
    }
}
