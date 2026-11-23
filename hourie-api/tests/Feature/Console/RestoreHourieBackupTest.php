<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Builds a backup folder shaped like the output of `hourie:backup`, with a
 * fake MySQL client that records the SQL it receives.
 *
 * @param  array<string, string>  $uploads
 * @return array{root: string, backup: string, imported: string, documents: string, images: string}
 */
function makeRestoreFixture(array $uploads): array
{
    $root = storage_path('framework/testing/hourie-restore-'.Str::uuid());
    $backup = $root.'/backup';
    $documents = $root.'/documents';
    $images = $root.'/images';
    $imported = $root.'/imported.sql';
    $client = $root.'/mysql';

    File::ensureDirectoryExists($backup);
    File::ensureDirectoryExists($documents);
    File::ensureDirectoryExists($images);

    $database = new ZipArchive;
    $database->open($backup.'/database.zip', ZipArchive::CREATE);
    $database->addFromString('database.sql', 'INSERT INTO restore_test VALUES (1);');
    $database->close();

    $files = new ZipArchive;
    $files->open($backup.'/uploaded-files.zip', ZipArchive::CREATE);
    foreach ($uploads as $name => $contents) {
        $files->addFromString($name, $contents);
    }
    $files->close();

    File::put($backup.'/checksums.txt', implode(PHP_EOL, [
        hash_file('sha256', $backup.'/database.zip').'  database.zip',
        hash_file('sha256', $backup.'/uploaded-files.zip').'  uploaded-files.zip',
    ]).PHP_EOL);

    File::put($client, "#!/bin/sh\ncat > '{$imported}'\n");
    chmod($client, 0700);

    config()->set([
        'hourie-backup.mysql_binary' => $client,
        'database.connections.mysql.database' => 'hourie_test',
        'filesystems.disks.equipment-images.root' => $images,
        'filesystems.disks.equipment-documents.root' => $documents,
    ]);

    return compact('root', 'backup', 'imported', 'documents', 'images');
}

beforeEach(function (): void {
    if (PHP_OS_FAMILY === 'Windows') {
        $this->markTestSkipped('The fake MySQL client fixture requires a POSIX shell.');
    }
});

it('imports the database and puts the uploaded files back in place', function () {
    $fixture = makeRestoreFixture([
        'equipment-documents/purchase-orders/BC-821-26-0001.pdf' => 'purchase order',
        'equipment-images/generators/photo.jpg' => 'photo',
        'private/hourie-backup/mysql-old-machine.cnf' => 'old credentials',
    ]);

    try {
        $this->artisan('hourie:restore', ['path' => $fixture['backup'], '--force' => true])
            ->expectsOutputToContain('Restauration terminée et vérifiée.')
            ->assertSuccessful();

        expect(File::get($fixture['imported']))->toBe('INSERT INTO restore_test VALUES (1);')
            ->and(File::get($fixture['documents'].'/purchase-orders/BC-821-26-0001.pdf'))->toBe('purchase order')
            ->and(File::get($fixture['images'].'/generators/photo.jpg'))->toBe('photo')
            ->and(File::exists(storage_path('app/private/hourie-backup/mysql-old-machine.cnf')))->toBeFalse();
    } finally {
        File::deleteDirectory($fixture['root']);
    }
});

it('refuses a backup whose archives do not match their checksums', function () {
    $fixture = makeRestoreFixture(['equipment-documents/a.pdf' => 'a']);

    try {
        File::append($fixture['backup'].'/uploaded-files.zip', 'tampered');

        $this->artisan('hourie:restore', ['path' => $fixture['backup'], '--force' => true])
            ->expectsOutputToContain('Somme de contrôle invalide pour uploaded-files.zip')
            ->assertFailed();

        expect(File::exists($fixture['imported']))->toBeFalse()
            ->and(File::exists($fixture['documents'].'/a.pdf'))->toBeFalse();
    } finally {
        File::deleteDirectory($fixture['root']);
    }
});

it('refuses archive entries that would escape the storage folders', function () {
    $fixture = makeRestoreFixture(['equipment-documents/../../outside.txt' => 'escape']);

    try {
        $this->artisan('hourie:restore', ['path' => $fixture['backup'], '--force' => true])
            ->expectsOutputToContain('Chemin inattendu dans l’archive')
            ->assertFailed();

        expect(File::exists($fixture['root'].'/outside.txt'))->toBeFalse();
    } finally {
        File::deleteDirectory($fixture['root']);
    }
});

it('does nothing when the confirmation is declined', function () {
    $fixture = makeRestoreFixture(['equipment-documents/a.pdf' => 'a']);

    try {
        $this->artisan('hourie:restore', ['path' => $fixture['backup']])
            ->expectsConfirmation('La base « hourie_test » va être entièrement remplacée par la sauvegarde. Continuer ?', 'no')
            ->assertFailed();

        expect(File::exists($fixture['imported']))->toBeFalse();
    } finally {
        File::deleteDirectory($fixture['root']);
    }
});
