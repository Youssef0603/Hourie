<?php

return [
    /*
     * The scheduled backup copies the database and uploaded files to a local or
     * USB destination. It is turned off where the platform keeps its own
     * backups (Azure: MySQL point-in-time restore, storage soft delete).
     */
    'enabled' => (bool) env('BACKUP_ENABLED', true),
    'root' => env('BACKUP_ROOT', env('BACKUP_USB_PATH', storage_path('app/backups'))),
    'volume_uuid' => env('BACKUP_VOLUME_UUID', env('BACKUP_USB_UUID')),
    'directory' => env('BACKUP_DIRECTORY', 'HOURIE_BACKUPS'),
    'retention_count' => (int) env('BACKUP_RETENTION_COUNT', 60),
    'minimum_free_bytes' => (int) env('BACKUP_MINIMUM_FREE_BYTES', 1073741824),
    'mysqldump_binary' => env('MYSQLDUMP_BINARY', 'mysqldump'),
    'mysql_binary' => env('MYSQL_BINARY', 'mysql'),
    'diskutil_binary' => env('DISKUTIL_BINARY', '/usr/sbin/diskutil'),
];
