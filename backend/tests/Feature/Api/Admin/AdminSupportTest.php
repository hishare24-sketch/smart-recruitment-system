<?php

namespace Tests\Feature\Api\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Modules\Support\Database\Seeders\TicketSeeder;
use Modules\Support\Entities\Ticket;
use Modules\Support\Events\TicketReplyPosted;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;
use Tests\Support\Api\AssertsApiJson;
use Tests\TestCase;

class AdminSupportTest extends TestCase
{
    use AssertsApiJson, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('permission:insert');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Agent', 'email' => 'sp'.uniqid().'@rec.test', 'password' => 'secret123']);
        $admin->assignRole(Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first());
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_filter_and_stat_tickets(): void
    {
        $this->admin();
        $this->seed(TicketSeeder::class);

        $this->getJson('/api/admin/tickets')->assertOk()->assertJsonStructure(['data' => [['subject', 'status', 'priority', 'repliesCount']], 'meta']);
        $this->getJson('/api/admin/tickets?status=open')->assertOk()->assertJsonPath('meta.total', 3);

        $this->getJson('/api/admin/tickets/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total', 'open', 'pending', 'resolved', 'byCategory', 'byPriority', 'series']])
            ->assertJsonPath('data.total', 5);
    }

    public function test_show_returns_conversation(): void
    {
        $this->admin();
        $ticket = Ticket::create(['user_name' => 'U', 'subject' => 'S', 'category' => 'technical', 'priority' => 'normal', 'status' => 'open']);
        $ticket->replies()->create(['author_name' => 'U', 'is_staff' => false, 'body' => 'مشكلة']);

        $this->getJson("/api/admin/tickets/{$ticket->id}")
            ->assertOk()
            ->assertJsonPath('data.replies.0.body', 'مشكلة')
            ->assertJsonPath('data.replies.0.isStaff', false);
    }

    public function test_staff_reply_appends_and_moves_open_to_pending(): void
    {
        $agent = $this->admin();
        $ticket = Ticket::create(['user_name' => 'U', 'subject' => 'S', 'category' => 'billing', 'priority' => 'high', 'status' => 'open']);

        $this->postJson("/api/admin/tickets/{$ticket->id}/reply", ['body' => 'نعمل على حلّها'])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('ticket_replies', ['ticket_id' => $ticket->id, 'is_staff' => true, 'author_name' => $agent->name]);
    }

    public function test_status_and_assign(): void
    {
        $agent = $this->admin();
        $ticket = Ticket::create(['user_name' => 'U', 'subject' => 'S', 'category' => 'other', 'priority' => 'low', 'status' => 'open']);

        $this->putJson("/api/admin/tickets/{$ticket->id}/status", ['status' => 'resolved'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');

        $this->postJson("/api/admin/tickets/{$ticket->id}/assign")
            ->assertOk()->assertJsonPath('data.assignee', $agent->name);
    }

    public function test_non_admin_cannot_view_tickets(): void
    {
        Sanctum::actingAs(User::create(['name' => 'U', 'email' => 'sp'.uniqid().'@rec.test', 'password' => 'secret123']));
        $this->getJson('/api/admin/tickets')->assertStatus(403);
    }

    public function test_staff_reply_broadcasts_to_owner_channel(): void
    {
        $this->admin();
        $owner = User::create(['name' => 'صاحب التذكرة', 'email' => 'own'.uniqid().'@rec.test', 'password' => 'secret123']);
        $ticket = Ticket::create(['user_id' => $owner->id, 'user_name' => $owner->name, 'subject' => 'S', 'category' => 'billing', 'priority' => 'high', 'status' => 'open']);

        Event::fake([TicketReplyPosted::class]);
        $this->postJson("/api/admin/tickets/{$ticket->id}/reply", ['body' => 'نعمل عليها'])->assertOk();

        Event::assertDispatched(TicketReplyPosted::class, fn (TicketReplyPosted $e) => $e->channelName === 'user.'.$owner->fresh()->uuid
            && $e->payload['ticketId'] === $ticket->id
            && $e->payload['reply']['isStaff'] === true);
    }
}
