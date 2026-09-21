<?php

namespace App\Console\Commands;

use App\Models\EquipmentImage;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

#[Signature('equipment-images:migrate-private {--keep-source : Keep the original public file after a successful copy}')]
#[Description('Move existing equipment images to the configured private equipment image disk')]
class MigrateEquipmentImagesToPrivateStorage extends Command
{
    public function handle(): int
    {
        $targetDisk = (string) config('filesystems.equipment_images_disk');
        $failed = 0;
        $migrated = 0;

        EquipmentImage::query()->orderBy('id')->each(function (EquipmentImage $image) use ($targetDisk, &$failed, &$migrated): void {
            if ($image->disk === $targetDisk) {
                return;
            }

            $source = Storage::disk($image->disk);
            $target = Storage::disk($targetDisk);
            if (! $source->exists($image->path)) {
                $this->error("Image {$image->id}: source file is missing.");
                $failed++;

                return;
            }

            $contents = $source->get($image->path);
            if (! $target->put($image->path, $contents) || ! $target->exists($image->path)) {
                $this->error("Image {$image->id}: private copy failed.");
                $failed++;

                return;
            }

            $image->update(['disk' => $targetDisk]);
            if (! $this->option('keep-source')) {
                $source->delete($image->path);
            }
            $migrated++;
        });

        $this->info("Migrated {$migrated} image(s) to {$targetDisk}.");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
