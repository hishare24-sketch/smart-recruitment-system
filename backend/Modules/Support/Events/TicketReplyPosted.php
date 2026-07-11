<?php

namespace Modules\Support\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Support\Entities\Ticket;
use Modules\Support\Entities\TicketReply;

/**
 * ردّ تذكرة لحظيّ عبر Reverb — يُبثّ لصاحب التذكرة (على قناته) عند ردّ الدعم،
 * ولقناة الأدمن `support.admin` عند ردّ المستخدم. الحدث `ticket.reply`.
 */
class TicketReplyPosted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public array $payload, public string $channelName) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel($this->channelName);
    }

    public function broadcastAs(): string
    {
        return 'ticket.reply';
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }

    /** حمولة موحّدة مسطّحة (camelCase) من التذكرة + الردّ. */
    public static function payloadFor(Ticket $ticket, TicketReply $reply): array
    {
        return [
            'ticketId' => $ticket->id,
            'subject' => $ticket->subject,
            'status' => $ticket->status,
            'reply' => [
                'id' => $reply->id,
                'author' => $reply->author_name,
                'isStaff' => (bool) $reply->is_staff,
                'body' => $reply->body,
                'at' => optional($reply->created_at)->toISOString(),
            ],
        ];
    }
}
