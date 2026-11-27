<?php

namespace App\Enums;

/**
 * Account roles, by job:
 * - Manager (Direction) and CmsManager (Responsable système): everything.
 * - EquipmentManager (Responsable matériel): equipment of every site.
 * - SiteManager (Chef de chantier): equipment of his own site only (the site
 *   he is assigned to in Personnel); no company-wide modules.
 * - Purchaser (Acheteur): purchase orders, delivery notes and invoices.
 * - Mechanic (Mécanicien): maintenance and repairs on every machine.
 * - Viewer (Lecture seule): reads everything, changes nothing.
 * - GeneratorManager: legacy, no longer offered; kept for existing accounts.
 */
enum UserRole: string
{
    case Manager = 'manager';
    case CmsManager = 'cms_manager';
    case EquipmentManager = 'equipment_manager';
    case SiteManager = 'site_manager';
    case Purchaser = 'purchaser';
    case Mechanic = 'mechanic';
    case GeneratorManager = 'generator_manager';
    case Viewer = 'viewer';

    /** Direction and Responsable système. */
    public function isAdministrator(): bool
    {
        return in_array($this, [self::Manager, self::CmsManager], true);
    }

    /** Sees and changes only the equipment of the site he is assigned to. */
    public function isSiteScoped(): bool
    {
        return $this === self::SiteManager;
    }

    /** Edit equipment (a site manager only on his own site, checked by the policy). */
    public function canManageEquipment(): bool
    {
        return $this->isAdministrator()
            || in_array($this, [self::EquipmentManager, self::SiteManager, self::GeneratorManager], true);
    }

    /** Register new equipment and import lists: the people in charge of the whole fleet. */
    public function canCreateEquipment(): bool
    {
        return $this->isAdministrator() || in_array($this, [self::EquipmentManager, self::GeneratorManager], true);
    }

    /** Move equipment from one site to another. */
    public function canTransferEquipment(): bool
    {
        return $this->canCreateEquipment();
    }

    /** Record maintenance and repairs. */
    public function canManageMaintenance(): bool
    {
        return $this->canManageEquipment() || $this === self::Mechanic;
    }

    /** Temporary admissions (customs): the people in charge of the whole fleet. */
    public function canManageTemporaryAdmissions(): bool
    {
        return $this->canCreateEquipment();
    }

    /** Sites, insurance, bonds, settings and reminder e-mails. */
    public function canManageSites(): bool
    {
        return $this->isAdministrator();
    }

    public function canManageUsers(): bool
    {
        return $this->isAdministrator();
    }

    public function canManagePurchaseOrders(): bool
    {
        return $this->isAdministrator() || $this === self::Purchaser;
    }

    public function canManageSubcontracts(): bool
    {
        return $this->isAdministrator();
    }

    public function canManageManagerAccounts(): bool
    {
        return $this->isAdministrator();
    }

    public function canDeleteMaintenance(): bool
    {
        return $this->isAdministrator() || $this === self::EquipmentManager;
    }

    public function canDeleteEquipment(): bool
    {
        return $this->isAdministrator() || $this === self::EquipmentManager;
    }
}
