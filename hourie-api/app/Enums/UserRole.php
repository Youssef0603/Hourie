<?php

namespace App\Enums;

enum UserRole: string
{
    case Manager = 'manager';
    case CmsManager = 'cms_manager';
    case GeneratorManager = 'generator_manager';
    case Viewer = 'viewer';

    public function canManageEquipment(): bool
    {
        return in_array($this, [self::Manager, self::CmsManager, self::GeneratorManager], true);
    }

    public function canManageSites(): bool
    {
        return in_array($this, [self::Manager, self::CmsManager], true);
    }

    public function canDeleteMaintenance(): bool
    {
        return $this === self::Manager;
    }
}
