<?php

namespace App\Mail\Transport;

use Illuminate\Http\Client\Factory as HttpFactory;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Throwable;

class MicrosoftGraphTransport extends AbstractTransport
{
    private ?string $accessToken = null;

    private int $accessTokenExpiresAt = 0;

    public function __construct(
        private readonly HttpFactory $http,
        private readonly string $tenantId,
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $sender,
        private readonly string $loginBaseUrl = 'https://login.microsoftonline.com',
        private readonly string $graphBaseUrl = 'https://graph.microsoft.com/v1.0',
        private readonly int $connectTimeout = 5,
        private readonly int $timeout = 30,
    ) {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'microsoft-graph';
    }

    protected function doSend(SentMessage $message): void
    {
        try {
            $response = $this->http
                ->withToken($this->getAccessToken())
                ->withBody(base64_encode($message->toString()), 'text/plain')
                ->connectTimeout($this->connectTimeout)
                ->timeout($this->timeout)
                ->post($this->graphBaseUrl.'/users/'.rawurlencode($this->sender).'/sendMail');

            if ($response->status() !== 202) {
                throw new TransportException('Microsoft Graph rejected the email with HTTP status '.$response->status().'.');
            }
        } catch (TransportException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new TransportException('Microsoft Graph email delivery failed.', previous: $exception);
        }
    }

    private function getAccessToken(): string
    {
        if ($this->accessToken !== null && time() < $this->accessTokenExpiresAt) {
            return $this->accessToken;
        }

        try {
            $response = $this->http
                ->asForm()
                ->connectTimeout($this->connectTimeout)
                ->timeout($this->timeout)
                ->post($this->loginBaseUrl.'/'.rawurlencode($this->tenantId).'/oauth2/v2.0/token', [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'scope' => 'https://graph.microsoft.com/.default',
                    'grant_type' => 'client_credentials',
                ]);

            if (! $response->successful() || ! is_string($response->json('access_token'))) {
                throw new TransportException('Microsoft Entra authentication failed with HTTP status '.$response->status().'.');
            }

            $this->accessToken = $response->json('access_token');
            $expiresIn = max(60, (int) $response->json('expires_in', 3600));
            $this->accessTokenExpiresAt = time() + $expiresIn - 30;

            return $this->accessToken;
        } catch (TransportException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new TransportException('Microsoft Entra authentication failed.', previous: $exception);
        }
    }
}
