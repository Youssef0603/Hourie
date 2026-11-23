<?php

namespace App\Models;

use Brick\Math\BigDecimal;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['subcontract_id', 'variation_id', 'position', 'code', 'description', 'unit', 'quantity', 'unit_price', 'materials_supplied_by'])]
class SubcontractItem extends Model
{
    public function subcontract(): BelongsTo
    {
        return $this->belongsTo(Subcontract::class);
    }

    public function variation(): BelongsTo
    {
        return $this->belongsTo(SubcontractVariation::class, 'variation_id');
    }

    public const SUPPLIED_BY_SUBCONTRACTOR = 'subcontractor';

    public const SUPPLIED_BY_ARH = 'arh';

    /** Materials ARH supplies for this work item. */
    public function materials(): HasMany
    {
        return $this->hasMany(SubcontractItemMaterial::class)->orderBy('id');
    }

    public function variationLines(): HasMany
    {
        return $this->hasMany(SubcontractVariationLine::class);
    }

    /** Contract quantity plus every quantity added by a variation. */
    public function authorizedQuantity(): BigDecimal
    {
        return $this->variationLines->reduce(
            fn (BigDecimal $total, SubcontractVariationLine $line): BigDecimal => $total->plus((string) $line->quantity),
            BigDecimal::of((string) $this->quantity),
        );
    }

    /**
     * Saves who buys the materials and, when ARH does, how much of each
     * material one unit of work consumes.
     *
     * @param  array<string, mixed>  $input
     */
    public function syncMaterials(array $input): void
    {
        $suppliedBy = $input['materials_supplied_by'] ?? $this->materials_supplied_by ?? self::SUPPLIED_BY_SUBCONTRACTOR;
        $this->update(['materials_supplied_by' => $suppliedBy]);
        $materials = $suppliedBy === self::SUPPLIED_BY_ARH ? ($input['materials'] ?? []) : [];

        $this->materials()->whereNotIn('id', collect($materials)->pluck('id')->filter()->all())->delete();
        foreach ($materials as $material) {
            $attributes = collect($material)->only(['name', 'unit', 'quantity_per_unit', 'waste_percent'])->all();
            $existing = isset($material['id']) ? $this->materials()->find($material['id']) : null;
            $existing ? $existing->update($attributes) : $this->materials()->create($attributes);
        }
    }

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
        ];
    }
}
