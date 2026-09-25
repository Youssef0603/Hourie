<?php

namespace App\Mail;

use App\Models\Equipment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CarInspectionReminder extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly Equipment $car) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Rappel de visite — '.$this->car->asset_code,
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.equipment.car-inspection-reminder');
    }
}
