<?php

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;

/**
 * The upload disks switch to Azure Blob Storage with one setting, keeping
 * their names so existing file records still point to the right disk.
 */
function filesystemsConfig(): array
{
    return require config_path('filesystems.php');
}

it('keeps uploads on the local disk by default', function () {
    $disks = filesystemsConfig()['disks'];

    expect($disks['equipment-documents']['driver'])->toBe('local')
        ->and($disks['equipment-images']['driver'])->toBe('local');
});

it('stores uploads in one Azure Blob container, one folder per disk', function () {
    putenv('FILES_STORAGE=azure-blob');
    putenv('AZURE_STORAGE_ACCOUNT=hourieprod');
    $_ENV['FILES_STORAGE'] = $_SERVER['FILES_STORAGE'] = 'azure-blob';
    $_ENV['AZURE_STORAGE_ACCOUNT'] = $_SERVER['AZURE_STORAGE_ACCOUNT'] = 'hourieprod';

    try {
        $disks = filesystemsConfig()['disks'];
    } finally {
        putenv('FILES_STORAGE');
        putenv('AZURE_STORAGE_ACCOUNT');
        unset($_ENV['FILES_STORAGE'], $_SERVER['FILES_STORAGE'], $_ENV['AZURE_STORAGE_ACCOUNT'], $_SERVER['AZURE_STORAGE_ACCOUNT']);
    }

    expect($disks['equipment-documents'])->toMatchArray([
        'driver' => 'azure-storage-blob',
        'credential' => 'managed_identity',
        'account_name' => 'hourieprod',
        'container' => 'hourie-files',
        'prefix' => 'equipment-documents',
    ])
        ->and($disks['equipment-images']['prefix'])->toBe('equipment-images');

    config(['filesystems.disks.blob-check' => $disks['equipment-documents']]);
    expect(Storage::disk('blob-check'))->toBeInstanceOf(FilesystemAdapter::class);
});
