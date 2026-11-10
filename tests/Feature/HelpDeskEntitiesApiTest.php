<?php

namespace Tests\Feature;

use App\Enums\TicketStatus;
use App\Models\Category;
use App\Models\KnowledgeBaseArticle;
use App\Models\Tag;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HelpDeskEntitiesApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TC-11: Регистрация клиента, получение токена, проверка профиля (/api/user) и выход (/api/logout).
     */
    public function test_auth_register_login_me_and_logout_flow(): void
    {
        $registerResponse = $this->postJson('/api/register', [
            'name' => 'Тестовый Клиент',
            'email' => 'newclient@helpdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $registerResponse->assertStatus(201)
            ->assertJsonPath('data.email', 'newclient@helpdesk.local')
            ->assertJsonPath('data.role', 'client')
            ->assertJsonStructure(['data' => ['id', 'name', 'email', 'role'], 'token']);

        $this->assertDatabaseHas('users', [
            'email' => 'newclient@helpdesk.local',
            'role' => 'client',
        ]);

        // Дубликат email при регистрации возвращает 422
        $this->postJson('/api/register', [
            'name' => 'Дубликат',
            'email' => 'newclient@helpdesk.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        // Вход с неверным паролем возвращает 401
        $this->postJson('/api/login', [
            'email' => 'newclient@helpdesk.local',
            'password' => 'wrong-password',
        ])->assertStatus(401);

        // Успешный вход
        $loginResponse = $this->postJson('/api/login', [
            'email' => 'newclient@helpdesk.local',
            'password' => 'password123',
        ]);
        $loginResponse->assertStatus(200);
        $token = $loginResponse->json('token');

        // Получение профиля по Bearer-токену
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('data.email', 'newclient@helpdesk.local');

        // Выход из системы
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout')
            ->assertStatus(204);
    }

    /**
     * TC-12: Переписка по заявке — добавление сообщения, запрет в закрытую заявку (409) и скрытие служебных заметок от клиента.
     */
    public function test_messages_creation_internal_visibility_and_closed_ticket_rule(): void
    {
        $client = User::factory()->create();
        $support = User::factory()->support()->create();
        $category = Category::factory()->create();

        $ticket = Ticket::factory()->create([
            'user_id' => $client->id,
            'assignee_id' => $support->id,
            'category_id' => $category->id,
            'status' => TicketStatus::InProgress->value,
        ]);

        // 1. Клиент отправляет обычное сообщение -> 201
        Sanctum::actingAs($client);
        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Подскажите, когда будет решена проблема?',
        ])->assertStatus(201)
            ->assertJsonPath('data.body', 'Подскажите, когда будет решена проблема?');

        // 2. Клиент пытается создать служебную заметку (is_internal = true) -> 422
        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Попытка внутренней заметки',
            'is_internal' => true,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['is_internal']);

        // 3. Специалист создаёт служебную заметку -> 201
        Sanctum::actingAs($support);
        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Внутренний комментарий для инженеров',
            'is_internal' => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.is_internal', true);

        // Специалист видит оба сообщения (2), а клиент — только публичное (1)
        $this->getJson("/api/v1/tickets/{$ticket->id}/messages")
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        Sanctum::actingAs($client);
        $this->getJson("/api/v1/tickets/{$ticket->id}/messages")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // 4. В закрытую заявку нельзя добавить сообщение -> 409 Conflict
        $ticket->update(['status' => TicketStatus::Closed->value]);
        $this->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Сообщение после закрытия',
        ])->assertStatus(409);
    }

    /**
     * TC-13: Категории — создание администратором, запрет для клиента (403) и запрет удаления категории с заявками (409).
     */
    public function test_categories_crud_and_cannot_delete_category_with_tickets(): void
    {
        $client = User::factory()->create();
        $admin = User::factory()->admin()->create();

        // Клиент не может создать категорию -> 403
        Sanctum::actingAs($client);
        $this->postJson('/api/v1/categories', [
            'name' => 'Новая категория',
        ])->assertStatus(403);

        // Администратор создаёт категорию -> 201
        Sanctum::actingAs($admin);
        $createResp = $this->postJson('/api/v1/categories', [
            'name' => 'Корпоративная почта',
            'description' => 'Настройка почтовых ящиков',
        ]);
        $createResp->assertStatus(201)
            ->assertJsonPath('data.name', 'Корпоративная почта');

        $categoryId = $createResp->json('data.id');

        // Создаём заявку в этой категории
        Ticket::factory()->create(['category_id' => $categoryId]);

        // Попытка удалить категорию с заявками -> 409 Conflict
        $this->deleteJson("/api/v1/categories/{$categoryId}")
            ->assertStatus(409);

        // Пустая категория удаляется успешно -> 204
        $emptyCategory = Category::factory()->create(['name' => 'Временная категория']);
        $this->deleteJson("/api/v1/categories/{$emptyCategory->id}")
            ->assertStatus(204);
    }

    /**
     * TC-14: Метки (Tags) и база знаний (Knowledge Base) — фильтрация опубликованных статей и привязка меток.
     */
    public function test_tags_and_knowledge_base_articles_workflow(): void
    {
        $support = User::factory()->support()->create();
        $client = User::factory()->create();
        $category = Category::factory()->create();

        Sanctum::actingAs($support);

        // Создание метки
        $tagResp = $this->postJson('/api/v1/tags', ['name' => 'интеграция']);
        $tagResp->assertStatus(201)
            ->assertJsonPath('data.name', 'интеграция');
        $tagId = $tagResp->json('data.id');

        // Привязка и открепление метки от заявки
        $ticket = Ticket::factory()->create(['category_id' => $category->id]);
        $this->postJson("/api/v1/tickets/{$ticket->id}/tags", ['tag_id' => $tagId])
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.tags');

        $this->deleteJson("/api/v1/tickets/{$ticket->id}/tags/{$tagId}")
            ->assertStatus(200)
            ->assertJsonCount(0, 'data.tags');

        // Повторное открепление уже снятой метки -> 409 Conflict
        $this->deleteJson("/api/v1/tickets/{$ticket->id}/tags/{$tagId}")
            ->assertStatus(409);

        // Статьи базы знаний: 1 опубликованная и 1 черновик
        KnowledgeBaseArticle::factory()->create([
            'user_id' => $support->id,
            'category_id' => $category->id,
            'title' => 'Опубликованная инструкция VPN',
            'is_published' => true,
        ]);
        $draft = KnowledgeBaseArticle::factory()->create([
            'user_id' => $support->id,
            'category_id' => $category->id,
            'title' => 'Черновик статьи',
            'is_published' => false,
        ]);

        // Клиент видит только опубликованную статью (1) и получает 404 на черновик
        Sanctum::actingAs($client);
        $this->getJson('/api/v1/knowledge-base-articles')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/knowledge-base-articles/{$draft->id}")
            ->assertStatus(404);
    }

    /**
     * TC-15: Управление пользователями, сводная статистика и экспорт заявок в CSV.
     */
    public function test_users_management_statistics_and_csv_export(): void
    {
        $admin = User::factory()->admin()->create();
        $client = User::factory()->create();
        $category = Category::factory()->create();

        Ticket::factory()->create([
            'user_id' => $client->id,
            'category_id' => $category->id,
        ]);

        // Клиент не имеет доступа к списку пользователей -> 403
        Sanctum::actingAs($client);
        $this->getJson('/api/v1/users')->assertStatus(403);

        // Администратор получает список пользователей -> 200
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/users')->assertStatus(200);

        // Нельзя удалить пользователя, у которого есть заявки -> 409 Conflict
        $this->deleteJson("/api/v1/users/{$client->id}")->assertStatus(409);

        // Сводная статистика -> 200
        $this->getJson('/api/v1/statistics/tickets')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['total_tickets', 'by_status', 'by_priority', 'avg_resolution_minutes', 'by_category', 'workload'],
            ]);

        // Экспорт заявок в CSV -> 200
        $csvResponse = $this->get('/api/v1/tickets/export/csv');
        $csvResponse->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    /**
     * TC-16: Проверка CORS preflight-запроса (OPTIONS) и заголовка Access-Control-Allow-Origin для адреса клиента.
     */
    public function test_cors_preflight_allows_configured_frontend_origin(): void
    {
        $response = $this->call('OPTIONS', '/api/tickets', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization, Content-Type, Accept',
        ]);

        $response->assertStatus(204)
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }
}
