<?php

namespace App\Mail;

use App\Models\InsurancePolicy;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class InsuranceExpiryReminder extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $categoryLabel;

    public function __construct(public readonly InsurancePolicy $policy)
    {
        $this->policy->loadMissing(['documents', 'project', 'employees', 'equipment']);
        $this->categoryLabel = match ($this->policy->insurance_type) {
            'trc_rc' => 'TRC / RC',
            'individual_accident' => 'Accidents individuels',
            'group_health' => 'Santé groupe',
            'equipment' => 'Équipements',
            default => 'Assurance',
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Échéance assurance {$this->categoryLabel} — Police {$this->policy->policy_number}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.insurance.expiry-reminder');
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return $this->policy->documents
            ->filter(fn ($document): bool => Storage::disk($document->disk)->exists($document->path))
            ->map(fn ($document): Attachment => Attachment::fromStorageDisk($document->disk, $document->path)
                ->as(basename($document->original_name))
                ->withMime($document->mime_type ?: 'application/pdf'))
            ->values()
            ->all();
    }
}
