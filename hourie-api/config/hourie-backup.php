<?php

return [
    'usb_path' => env('BACKUP_USB_PATH', '/Volumes/YSANDISK'),
    'usb_uuid' => env('BACKUP_USB_UUID'),
    'directory' => env('BACKUP_DIRECTORY', 'HOURIE_BACKUPS'),
    'retention_count' => (int) env('BACKUP_RETENTION_COUNT', 60),
    'minimum_free_bytes' => (int) env('BACKUP_MINIMUM_FREE_BYTES', 1073741824),
    'mysqldump_binary' => env('MYSQLDUMP_BINARY', '/Applications/MAMP/Library/bin/mysqldump'),
    'diskutil_binary' => env('DISKUTIL_BINARY', '/usr/sbin/diskutil'),
    'gzip_binary' => env('GZIP_BINARY', '/usr/bin/gzip'),
    'tar_binary' => env('TAR_BINARY', '/usr/bin/tar'),
];
