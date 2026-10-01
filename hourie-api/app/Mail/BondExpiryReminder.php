<?php

namespace App\Mail;

use App\Models\Bond;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class BondExpiryReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Bond $bond)
    {
        $this->bond->loadMissing(['documents', 'project', 'location']);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(subject: "Échéance {$this->bond->typeLabel()} — {$this->bond->project->name}");
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(view: 'emails.bonds.expiry-reminder');
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return $this->bond->documents
            ->filter(fn ($document): bool => Storage::disk($document->disk)->exists($document->path))
            ->map(fn ($document): Attachment => Attachment::fromStorageDisk($document->disk, $document->path)
                ->as(basename($document->original_name))
                ->withMime($document->mime_type ?: 'application/pdf'))
            ->values()
            ->all();
    }
}
