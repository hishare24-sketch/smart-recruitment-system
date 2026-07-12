<?php

namespace Modules\Chat\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Modules\Chat\Entities\ChatSetting;
use Modules\Chat\Events\MessageSent;
use Modules\Chat\Http\Requests\Api\ReadThreadRequest;
use Modules\Chat\Http\Requests\Api\SendMessageRequest;
use Modules\Chat\Http\Resources\Api\DirectMessageResource;
use Modules\Chat\Services\MessageService;
use Modules\Notification\Services\NotificationService;
use Modules\User\Entities\User;

class MessageController extends Controller
{
    public function __construct(private readonly MessageService $service) {}

    public function send(SendMessageRequest $request)
    {
        // حوكمة المحادثات تحكم الإرسال فعليًّا (fallback مُفعّل عند غياب الإعداد — يُبقي السلوك القديم).
        if (! ChatSetting::flag('direct_messages_enabled', true)) {
            abort(403, __('Direct messaging is currently disabled by the platform administrator.'));
        }

        $user = $request->user();
        $message = $this->service->send($user->uuid, $user->name, $request->validated());
        $payload = (new DirectMessageResource($message))->resolve();

        // بثّ لحظيّ للمستقبِل عبر Reverb (قناة خاصّة user.{uuid})
        broadcast(new MessageSent($payload));

        // إشعار مُستديم للمستقبِل — يبقى في الشارة إن كان غير متّصل لحظة الإرسال.
        $recipientUuid = $request->validated()['recipientId'];
        if ($recipient = User::where('uuid', $recipientUuid)->first(['id', 'uuid'])) {
            app(NotificationService::class)->push($recipient->id, [
                'icon' => 'mdi-message-text',
                'title' => 'رسالة جديدة من '.$user->name,
                'body' => Str::limit($request->validated()['body'], 90),
                'category' => 'message',
                'actionTo' => '/messages',
                'uuid' => $recipient->uuid,
            ]);
        }

        return response()->json($this->dataResponse($payload), 201);
    }

    public function listMine(Request $request)
    {
        return $this->dataResponse(DirectMessageResource::collection($this->service->listMine($request->user()->uuid)));
    }

    public function markRead(ReadThreadRequest $request)
    {
        $this->service->markThreadRead($request->user()->uuid, $request->validated()['peerId']);

        return response()->noContent();
    }

    public function resolve(string $slug)
    {
        return $this->dataResponse($this->service->resolveOwner($slug));
    }
}
