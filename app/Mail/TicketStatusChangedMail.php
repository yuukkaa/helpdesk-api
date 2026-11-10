<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TicketStatusChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Ticket $ticket,
        public readonly string $oldStatus,
        public readonly string $newStatus,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Help Desk: статус заявки #{$this->ticket->id} изменён на «{$this->newStatus}»",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: "
                <h2>Уведомление службы технической поддержки</h2>
                <p>По вашей заявке <strong>#{$this->ticket->id} «{$this->ticket->subject}»</strong> изменён статус.</p>
                <p>Предыдущий статус: <code>{$this->oldStatus}</code></p>
                <p>Новый статус: <strong><code>{$this->newStatus}</code></strong></p>
            ",
        );
    }
}
