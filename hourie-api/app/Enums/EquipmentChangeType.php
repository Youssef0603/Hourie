<?php

namespace App\Enums;

enum EquipmentChangeType: string
{
    case InitialImport = 'initial_import';
    case IdentityUpdated = 'identity_updated';
    case SpecificationsUpdated = 'specifications_updated';
    case ConditionChanged = 'condition_changed';
    case LocationChanged = 'location_changed';
    case CustodianChanged = 'custodian_changed';
    case ProjectAssignmentChanged = 'project_assignment_changed';
    case MaintenanceRecorded = 'maintenance_recorded';
    case MaintenanceUpdated = 'maintenance_updated';
    case MaintenanceDeleted = 'maintenance_deleted';
    case ImageAdded = 'image_added';
    case ImageDeleted = 'image_deleted';
    case InvoiceAdded = 'invoice_added';
    case InvoiceDeleted = 'invoice_deleted';
    case VehicleDocumentAdded = 'vehicle_document_added';
    case VehicleDocumentDeleted = 'vehicle_document_deleted';
    case Archived = 'archived';
}
