<?php

namespace App\Models;

use Database\Factories\SubcontractorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'contact_name', 'phone', 'email', 'tax_number', 'notes', 'is_active'])]
class Subcontractor extends Model
{
    /** @use HasFactory<SubcontractorFactory> */
    use HasFactory;

    public function subcontracts(): HasMany
    {
        return $this->hasMany(Subcontract::class);
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
