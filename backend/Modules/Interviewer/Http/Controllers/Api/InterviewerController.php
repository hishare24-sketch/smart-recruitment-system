<?php

namespace Modules\Interviewer\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Interviewer\Http\Requests\Api\CreateBookingRequest;
use Modules\Interviewer\Http\Requests\Api\UpdateBookingRequest;
use Modules\Interviewer\Http\Resources\Api\BookingResource;
use Modules\Interviewer\Http\Resources\Api\InterviewerResource;
use Modules\Interviewer\Services\InterviewerService;

class InterviewerController extends Controller
{
    public function __construct(private readonly InterviewerService $service) {}

    public function index(Request $request)
    {
        $page = $this->service->list($this->perPage($request));

        return $this->paginatedResource($page, InterviewerResource::class);
    }

    public function book(CreateBookingRequest $request, int $id)
    {
        $booking = $this->service->book($request->user()->id, $id, $request->validated());

        return response()->json($this->dataResponse(BookingResource::make($booking)), 201);
    }

    public function updateBooking(UpdateBookingRequest $request, int $id)
    {
        $booking = $this->service->update($request->user()->id, $id, $request->validated());

        return $this->updatedResponse(BookingResource::make($booking));
    }
}
