<?php

namespace Tests\Feature;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TicketApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TC-01: Неавторизованный запрос к списку заявок возвращает 401.
     */
    public function test_unauthenticated_user_cannot_access_tickets(): void
    {
        $response = $this->getJson('/api/v1/tickets');

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Требуется авторизация.');
    }

    /**
     * TC-02: Клиент успешно создаёт заявку с тегами и вложением, запись сохраняется в БД.
     */
    public function test_client_can_create_ticket_with_tags_and_attachment(): void
    {
        Storage::fake('public');

        $client = User::factory()->create();
        $category = Category::factory()->create(['name' => 'Технические ошибки']);
        $tag = Tag::factory()->create(['name' => 'срочно']);

        Sanctum::actingAs($client);

        $file = UploadedFile::fake()->image('screenshot.png', 400, 300);

        $response = $this->postJson('/api/v1/tickets', [
            'subject' => 'Ошибка 500 при формировании отчёта',
            'description' => 'При нажатии на кнопку выгрузки появляется экран ошибки.',
            'category_id' => $category->id,
            'priority' => TicketPriority::High->value,
            'tags' => [$tag->id],
            'attachments' => [$file],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.subject', 'Ошибка 500 при формировании отчёта')
            ->assertJsonPath('data.status', TicketStatus::New->value)
            ->assertJsonPath('data.priority', TicketPriority::High->value)
            ->assertJsonPath('data.author.id', $client->id);

        $this->assertDatabaseHas('tickets', [
            'subject' => 'Ошибка 500 при формировании отчёта',
            'user_id' => $client->id,
            'category_id' => $category->id,
            'status' => 'new',
            'priority' => 'high',
        ]);

        $this->assertDatabaseHas('attachments', [
            'original_name' => 'screenshot.png',
        ]);
    }

    /**
     * TC-03: Ошибки валидации (422) при создании заявки с пустыми полями.
     */
    public function test_create_ticket_validation_errors(): void
    {
        $client = User::factory()->create();
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/v1/tickets', [
            'subject' => '',
            'description' => '',
            'category_id' => 9999,
            'priority' => 'invalid_priority',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['subject', 'description', 'category_id', 'priority']);
    }

    /**
     * TC-04: Изоляция данных — клиент видит в списке только свои заявки, а не чужие.
     */
    public function test_client_sees_only_own_tickets_and_cannot_view_foreign_ticket(): void
    {
        $client1 = User::factory()->create();
        $client2 = User::factory()->create();
        $category = Category::factory()->create();

        Ticket::factory()->count(2)->create([
            'user_id' => $client1->id,
            'category_id' => $category->id,
        ]);

        $foreignTicket = Ticket::factory()->create([
            'user_id' => $client2->id,
            'category_id' => $category->id,
        ]);

        Sanctum::actingAs($client1);

        $listResponse = $this->getJson('/api/v1/tickets');
        $listResponse->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $showForeignResponse = $this->getJson("/api/v1/tickets/{$foreignTicket->id}");
        $showForeignResponse->assertStatus(403);
    }

    /**
     * TC-05: Фильтрация, поиск и пагинация списка заявок для сотрудника поддержки.
     */
    public function test_tickets_filtering_search_and_pagination(): void
    {
        $support = User::factory()->support()->create();
        $category1 = Category::factory()->create(['name' => 'Доступ и VPN']);
        $category2 = Category::factory()->create(['name' => 'Бухгалтерия']);

        Ticket::factory()->count(6)->create([
            'category_id' => $category1->id,
            'status' => TicketStatus::New->value,
            'priority' => TicketPriority::High->value,
            'subject' => 'Проблема с подключением VPN',
        ]);

        Ticket::factory()->count(3)->create([
            'category_id' => $category2->id,
            'status' => TicketStatus::Resolved->value,
            'priority' => TicketPriority::Low->value,
            'subject' => 'Запрос акта сверки',
        ]);

        Sanctum::actingAs($support);

        $response = $this->getJson('/api/v1/tickets?status=new&priority=high&search=VPN&per_page=4&page=1');

        $response->assertStatus(200)
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.total', 6)
            ->assertJsonPath('meta.per_page', 4)
            ->assertJsonPath('meta.last_page', 2);
    }

    /**
     * TC-06: Специалист берёт заявку в работу (assign), статус автоматически меняется с new на in_progress.
     */
    public function test_support_can_self_assign_ticket_and_status_becomes_in_progress(): void
    {
        $support = User::factory()->support()->create();
        $category = Category::factory()->create();
        $ticket = Ticket::factory()->create([
            'category_id' => $category->id,
            'status' => TicketStatus::New->value,
            'assignee_id' => null,
        ]);

        Sanctum::actingAs($support);

        $response = $this->postJson("/api/v1/tickets/{$ticket->id}/assign");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', TicketStatus::InProgress->value)
            ->assertJsonPath('data.assignee.id', $support->id);

        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'assignee_id' => $support->id,
            'status' => TicketStatus::InProgress->value,
        ]);
    }

    /**
     * TC-07: Бизнес-правило — превышение лимита нагрузки (максимум 5 активных заявок на одного специалиста).
     */
    public function test_cannot_assign_more_than_five_active_tickets_to_agent(): void
    {
        $admin = User::factory()->admin()->create();
        $support = User::factory()->support()->create();
        $category = Category::factory()->create();

        // Создаём 5 активных заявок на специалисте
        Ticket::factory()->count(5)->create([
            'category_id' => $category->id,
            'assignee_id' => $support->id,
            'status' => TicketStatus::InProgress->value,
        ]);

        $sixthTicket = Ticket::factory()->create([
            'category_id' => $category->id,
            'status' => TicketStatus::New->value,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/tickets/{$sixthTicket->id}/assign", [
            'assignee_id' => $support->id,
        ]);

        $response->assertStatus(409);
    }

    /**
     * TC-08: Бизнес-правило — нельзя назначить клиента исполнителем и специалист не может назначить другого специалиста.
     */
    public function test_assign_business_rules_and_authorization(): void
    {
        $admin = User::factory()->admin()->create();
        $support1 = User::factory()->support()->create();
        $support2 = User::factory()->support()->create();
        $client = User::factory()->create();
        $category = Category::factory()->create();

        $ticket = Ticket::factory()->create([
            'category_id' => $category->id,
            'status' => TicketStatus::New->value,
        ]);

        // 1. Администратор пытается назначить клиента -> 409 Conflict
        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/tickets/{$ticket->id}/assign", [
            'assignee_id' => $client->id,
        ])->assertStatus(409);

        // 2. Специалист пытается назначить другого специалиста -> 403 Forbidden
        Sanctum::actingAs($support1);
        $this->postJson("/api/v1/tickets/{$ticket->id}/assign", [
            'assignee_id' => $support2->id,
        ])->assertStatus(403);
    }

    /**
     * TC-09: Бизнес-правило — проверка графа переходов статусов и заполнения resolved_at.
     */
    public function test_ticket_status_transitions_and_business_rules(): void
    {
        $support = User::factory()->support()->create();
        $category = Category::factory()->create();

        $ticket = Ticket::factory()->create([
            'category_id' => $category->id,
            'status' => TicketStatus::New->value,
            'assignee_id' => $support->id,
        ]);

        Sanctum::actingAs($support);

        // Недопустимый переход: new -> resolved (минуя in_progress) -> 409
        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => TicketStatus::Resolved->value,
        ])->assertStatus(409);

        // Допустимый переход: new -> in_progress -> 200
        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => TicketStatus::InProgress->value,
        ])->assertStatus(200)
            ->assertJsonPath('data.status', TicketStatus::InProgress->value);

        // Допустимый переход: in_progress -> resolved -> 200
        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => TicketStatus::Resolved->value,
        ])->assertStatus(200)
            ->assertJsonPath('data.status', TicketStatus::Resolved->value);

        $this->assertNotNull($ticket->fresh()->resolved_at);

        // Допустимый переход: resolved -> closed -> 200
        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => TicketStatus::Closed->value,
        ])->assertStatus(200)
            ->assertJsonPath('data.status', TicketStatus::Closed->value);

        // Переход из закрытой заявки запрещён -> 409
        $this->patchJson("/api/v1/tickets/{$ticket->id}/status", [
            'status' => TicketStatus::InProgress->value,
        ])->assertStatus(409);
    }

    /**
     * TC-10: Разграничение прав при удалении заявки — специалист получает 403, администратор удаляет (204).
     */
    public function test_only_admin_can_delete_ticket(): void
    {
        $support = User::factory()->support()->create();
        $admin = User::factory()->admin()->create();
        $category = Category::factory()->create();
        $ticket = Ticket::factory()->create(['category_id' => $category->id]);

        Sanctum::actingAs($support);
        $this->deleteJson("/api/v1/tickets/{$ticket->id}")->assertStatus(403);

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/v1/tickets/{$ticket->id}")->assertStatus(204);

        $this->assertDatabaseMissing('tickets', ['id' => $ticket->id]);
    }
}
