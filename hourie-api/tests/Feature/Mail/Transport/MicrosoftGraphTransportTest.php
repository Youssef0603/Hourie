<?php

use App\Mail\Transport\MicrosoftGraphTransport;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Email;

it('authenticates with Entra and sends MIME email through Microsoft Graph', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token' => Http::response([
            'access_token' => 'access-token',
            'expires_in' => 3600,
        ]),
        'https://graph.microsoft.com/v1.0/users/notifications%40hourie.com/sendMail' => Http::response(status: 202),
    ]);
    $transport = new MicrosoftGraphTransport(
        http: app(HttpFactory::class),
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        sender: 'notifications@hourie.com',
    );
    $email = (new Email)
        ->from('notifications@hourie.com')
        ->to('recipient@example.com')
        ->subject('Expiry reminder')
        ->html('<p>Reminder content</p>');

    $transport->send($email);
    $transport->send($email);

    Http::assertSentCount(3);
    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token'
            && $request['client_id'] === 'client-id'
            && $request['client_secret'] === 'client-secret'
            && $request['scope'] === 'https://graph.microsoft.com/.default'
            && $request['grant_type'] === 'client_credentials';
    });
    Http::assertSent(function (Request $request): bool {
        $mime = base64_decode($request->body(), true);

        return $request->url() === 'https://graph.microsoft.com/v1.0/users/notifications%40hourie.com/sendMail'
            && $request->hasHeader('Authorization', 'Bearer access-token')
            && is_string($mime)
            && str_contains($mime, 'Expiry reminder')
            && str_contains($mime, 'Reminder content');
    });
});

it('reports a rejected Graph delivery without exposing credentials', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token' => Http::response([
            'access_token' => 'access-token',
            'expires_in' => 3600,
        ]),
        'https://graph.microsoft.com/v1.0/users/notifications%40hourie.com/sendMail' => Http::response([
            'error' => ['message' => 'Rejected'],
        ], 403),
    ]);
    $transport = new MicrosoftGraphTransport(
        http: app(HttpFactory::class),
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: 'do-not-log-this-secret',
        sender: 'notifications@hourie.com',
    );
    $email = (new Email)
        ->from('notifications@hourie.com')
        ->to('recipient@example.com')
        ->subject('Expiry reminder')
        ->text('Reminder content');

    expect(fn () => $transport->send($email))
        ->toThrow(TransportException::class, 'Microsoft Graph rejected the email with HTTP status 403.');
});
