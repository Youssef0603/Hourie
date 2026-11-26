<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

it('creates verified database and upload archives in the configured destination', function () {
    if (PHP_OS_FAMILY === 'Windows') {
        $this->markTestSkipped('The test database exporter fixture requires a POSIX shell.');
    }

    $testRoot = storage_path('framework/testing/hourie-backup-'.Str::uuid());
    $destination = $testRoot.'/destination';
    $images = $testRoot.'/images';
    $documents = $testRoot.'/documents';
    $databaseExporter = $testRoot.'/mysqldump';

    try {
        File::ensureDirectoryExists($destination);
        File::ensureDirectoryExists($images);
        File::ensureDirectoryExists($documents);
        File::put($images.'/generator.jpg', 'generator image');
        File::put($documents.'/insurance.pdf', 'insurance document');
        File::put($databaseExporter, <<<'SH'
#!/bin/sh
for argument in "$@"; do
    case "$argument" in
        --result-file=*) result_file="${argument#--result-file=}" ;;
    esac
done
printf '%s\n' 'CREATE TABLE backup_test (id INT);' > "$result_file"
SH);
        chmod($databaseExporter, 0700);

        config()->set([
            'hourie-backup.root' => $destination,
            'hourie-backup.volume_uuid' => null,
            'hourie-backup.directory' => 'archives',
            'hourie-backup.minimum_free_bytes' => 1,
            'hourie-backup.mysqldump_binary' => $databaseExporter,
            'database.connections.mysql.database' => 'hourie_test',
            'database.connections.mysql.host' => '127.0.0.1',
            'database.connections.mysql.port' => 3306,
            'database.connections.mysql.username' => 'hourie',
            'database.connections.mysql.password' => 'secret',
            'filesystems.disks.equipment-images.root' => $images,
            'filesystems.disks.equipment-documents.root' => $documents,
        ]);

        $this->artisan('hourie:backup')->assertSuccessful();

        $backupDirectories = File::directories($destination.'/archives');
        expect($backupDirectories)->toHaveCount(1);

        $databaseArchive = new ZipArchive;
        expect($databaseArchive->open($backupDirectories[0].'/database.zip'))->toBeTrue();
        expect($databaseArchive->getFromName('database.sql'))->toContain('CREATE TABLE backup_test');
        $databaseArchive->close();

        $uploadsArchive = new ZipArchive;
        expect($uploadsArchive->open($backupDirectories[0].'/uploaded-files.zip'))->toBeTrue();
        expect($uploadsArchive->getFromName('equipment-images/generator.jpg'))->toBe('generator image');
        expect($uploadsArchive->getFromName('equipment-documents/insurance.pdf'))->toBe('insurance document');
        $uploadsArchive->close();

        expect(File::exists($backupDirectories[0].'/checksums.txt'))->toBeTrue();
        expect(File::exists($backupDirectories[0].'/backup-info.json'))->toBeTrue();
    } finally {
        File::deleteDirectory($testRoot);
    }
});

it('skips the scheduled backup when backups are turned off', function () {
    config(['hourie-backup.enabled' => false]);

    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event) => str_contains((string) $event->command, 'hourie:backup'));

    expect($event)->not->toBeNull()
        ->and($event->filtersPass(app()))->toBeFalse();

    config(['hourie-backup.enabled' => true]);
    expect($event->filtersPass(app()))->toBeTrue();
});
