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

        return Interviewer::orderByDesc('rating')->get();
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
            ['name' => 'خالد العتيبي', 'specialty' => 'tech', 'rating' => 4.8, 'price_from' => 200, 'availability' => json_encode(['الأحد', 'الثلاثاء']), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'ريم الدوسري', 'specialty' => 'management', 'rating' => 4.6, 'price_from' => 300, 'availability' => json_encode(['الاثنين', 'الأربعاء']), 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'سلمان الحربي', 'specialty' => 'data', 'rating' => 4.9, 'price_from' => 250, 'availability' => json_encode(['الخميس']), 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
