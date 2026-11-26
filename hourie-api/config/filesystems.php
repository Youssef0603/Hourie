<?php

/*
 * Uploaded files (equipment images, documents, invoices, PDFs) live on two
 * disks. They stay on the local disk by default; with
 * FILES_STORAGE=azure-blob they go to one Azure Blob Storage container,
 * each disk under its own folder, signed in with the web app's managed
 * identity. The disk names never change, so the stored records keep working.
 */
$uploadDisk = fn (string $name, string $localRoot): array => env('FILES_STORAGE', 'local') === 'azure-blob'
    ? [
        'driver' => 'azure-storage-blob',
        'credential' => env('AZURE_STORAGE_CREDENTIAL', 'managed_identity'),
        'account_name' => env('AZURE_STORAGE_ACCOUNT'),
        'account_key' => env('AZURE_STORAGE_KEY'),
        'client_id' => env('AZURE_STORAGE_CLIENT_ID'),
        'container' => env('AZURE_STORAGE_CONTAINER', 'hourie-files'),
        'prefix' => $name,
        'throw' => false,
        'report' => false,
    ]
    : [
        'driver' => 'local',
        'root' => $localRoot,
        'throw' => false,
        'report' => false,
    ];

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    'equipment_images_disk' => env('EQUIPMENT_IMAGES_DISK', 'equipment-images'),
    'equipment_documents_disk' => env('EQUIPMENT_DOCUMENTS_DISK', 'equipment-documents'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        'equipment-images' => $uploadDisk('equipment-images', env('EQUIPMENT_IMAGES_ROOT', storage_path('app/equipment-images'))),

        'equipment-documents' => $uploadDisk('equipment-documents', env('EQUIPMENT_DOCUMENTS_ROOT', storage_path('app/equipment-documents'))),

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
