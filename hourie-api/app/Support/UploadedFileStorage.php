<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use League\Flysystem\FilesystemException;
use RuntimeException;
use Throwable;

/**
 * Saves an uploaded file and refuses to go on when the storage did not keep
 * it (Azure Blob unreachable, missing permission…). The storage disks do not
 * always throw on their own, so without this check a document row could be
 * saved with no file behind it. The failure is logged and the request stops
 * with a clear message, before anything is written to the database.
 */
class UploadedFileStorage
{
    public static function store(UploadedFile $file, string $directory, string $disk): string
    {
        try {
            $path = $file->store($directory, $disk);
        } catch (FilesystemException $exception) {
            self::fail($disk, $directory, $exception);
        }

        if (! is_string($path) || $path === '') {
            self::fail($disk, $directory);
        }

        return $path;
    }

    private static function fail(string $disk, string $directory, ?Throwable $previous = null): never
    {
        report(new RuntimeException("Uploaded file could not be stored on disk [{$disk}] in [{$directory}].", previous: $previous));
        abort(503, __('validation.file_upload_failed'));
    }
}
