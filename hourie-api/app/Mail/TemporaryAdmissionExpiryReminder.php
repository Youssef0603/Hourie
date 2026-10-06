<?php

namespace App\Mail;

use App\Models\TemporaryAdmission;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class TemporaryAdmissionExpiryReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly TemporaryAdmission $admission)
    {
        $this->admission->loadMissing(['documents', 'equipment']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Échéance admission temporaire — {$this->admission->customs_reference}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.temporary-admissions.expiry-reminder');
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return $this->admission->documents
            ->filter(fn ($document): bool => Storage::disk($document->disk)->exists($document->path))
            ->map(fn ($document): Attachment => Attachment::fromStorageDisk($document->disk, $document->path)
                ->as(basename($document->original_name))
                ->withMime($document->mime_type ?: 'application/pdf'))
            ->values()
            ->all();
    }
}
