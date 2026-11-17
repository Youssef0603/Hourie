<?php

return [
    'root' => env('BACKUP_ROOT', env('BACKUP_USB_PATH', storage_path('app/backups'))),
    'volume_uuid' => env('BACKUP_VOLUME_UUID', env('BACKUP_USB_UUID')),
    'directory' => env('BACKUP_DIRECTORY', 'HOURIE_BACKUPS'),
    'retention_count' => (int) env('BACKUP_RETENTION_COUNT', 60),
    'minimum_free_bytes' => (int) env('BACKUP_MINIMUM_FREE_BYTES', 1073741824),
    'mysqldump_binary' => env('MYSQLDUMP_BINARY', 'mysqldump'),
    'diskutil_binary' => env('DISKUTIL_BINARY', '/usr/sbin/diskutil'),
];
