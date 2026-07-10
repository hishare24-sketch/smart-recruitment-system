<?php

namespace Modules\Interviewer\Services;

use Illuminate\Support\Collection;
use Modules\Interviewer\Entities\Booking;
use Modules\Interviewer\Entities\Interviewer;

class InterviewerService
{
    public function list(): Collection
    {
        $this->seedIfEmpty();

        // القائمة العامّة تعرض المقيّمين المعتمدين فقط (حوكمة الاعتماد الإداريّ).
        return Interviewer::where('status', 'approved')->orderByDesc('rating')->get();
    }

    public function book(int $userId, int $interviewerId, array $data): Booking
    {
        Interviewer::findOr($interviewerId, fn () => abort(404, __('Interviewer not found')));

        return Booking::create([
            'user_id' => $userId,
            'interviewer_id' => $interviewerId,
            'day' => $data['day'],
            'slot' => $data['slot'],
            'type' => $data['type'] ?? '',
            'status' => 'pending',
            'elements' => $data['elements'] ?? [],
            'report' => null,
        ]);
    }

    /** تحديث الحجز — للحاجز أو للمقيّم صاحب الحساب فقط (قبول/رفض/إكمال بتقرير). */
    public function update(int $userId, int $bookingId, array $data): Booking
    {
        $booking = Booking::findOr($bookingId, fn () => abort(404, __('Booking not found')));
        $interviewer = Interviewer::find($booking->interviewer_id);

        $isOwner = $booking->user_id === $userId;
        $isInterviewer = $interviewer?->user_id !== null && $interviewer->user_id === $userId;
        if (! $isOwner && ! $isInterviewer) {
            abort(403, __('You are not authorized to update this booking'));
        }

        if (array_key_exists('status', $data)) {
            $booking->status = $data['status'];
        }
        if (array_key_exists('report', $data)) {
            $booking->report = $data['report'];
        }
        $booking->save();

        return $booking;
    }

    private function seedIfEmpty(): void
    {
        if (Interviewer::count() > 0) {
            return;
        }

        Interviewer::insert([
            ['name' => 'خالد العتيبي', 'specialty' => 'tech', 'status' => 'approved', 'rating' => 4.8, 'price_from' => 200, 'availability' => json_encode(['الأحد', 'الثلاثاء']), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ريم الدوسري', 'specialty' => 'management', 'status' => 'approved', 'rating' => 4.6, 'price_from' => 300, 'availability' => json_encode(['الاثنين', 'الأربعاء']), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'سلمان الحربي', 'specialty' => 'data', 'status' => 'approved', 'rating' => 4.9, 'price_from' => 250, 'availability' => json_encode(['الخميس']), 'created_at' => now(), 'updated_at' => now()],
            // طلب اعتماد معلّق — للأدمن ليقبله/يرفضه (لا يظهر في القائمة العامّة).
            ['name' => 'منى القحطاني', 'specialty' => 'tech', 'status' => 'pending', 'rating' => 4.5, 'price_from' => 220, 'availability' => json_encode(['الثلاثاء', 'الخميس']), 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
