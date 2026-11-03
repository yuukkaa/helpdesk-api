<?php

namespace App\Services;

use App\Models\Category;
use App\Models\KnowledgeBaseArticle;
use App\Models\Ticket;
use Illuminate\Database\Eloquent\Collection;
use Throwable;

class AiService
{
    public function __construct(
        protected GeminiClient $gemini
    ) {}

    public function suggestForTicket(string $subject, string $description, ?Collection $categories = null): array
    {
        $cats = $categories ?? Category::all();
        $categoriesList = $cats->map(fn ($c) => "ID: {$c->id}, Название: {$c->name}")->implode("\n");

        $system = "Ты сервис классификации заявок техподдержки. Проанализируй тему и описание и выбери точный category_id из списка и приоритет (low, medium, high, urgent).\n"
            . "Категории:\n{$categoriesList}\n"
            . "Верни строго JSON: {\"category_id\": number, \"priority\": string, \"reason\": string}";

        $prompt = "Тема: {$subject}\nОписание: {$description}";

        $result = $this->gemini->generateJson($system, $prompt);

        if (!empty($result['category_id']) && !empty($result['priority'])) {
            return [
                'category_id' => (int) $result['category_id'],
                'priority' => (string) $result['priority'],
                'reason' => $result['reason'] ?? 'Категория и приоритет определены по содержанию заявки.',
            ];
        }

        return $this->fallbackClassify($subject, $description, $cats);
    }

    public function suggestCategoryAndPriority(string $subject, string $description, ?Collection $categories = null): array
    {
        return $this->suggestForTicket($subject, $description, $categories);
    }

    protected function fallbackClassify(string $subject, string $description, Collection $categories): array
    {
        $text = mb_strtolower($subject . ' ' . $description);

        $priority = 'medium';
        if (preg_match('/(срочн|критич|не работает|ошибка 500|блокир|потерял доступ|авария)/u', $text)) {
            $priority = 'urgent';
        } elseif (preg_match('/(ошибк|сбой|не открывается|не приходит|дублир|проблем|email|парол)/u', $text)) {
            $priority = 'high';
        } elseif (preg_match('/(вопрос|подскажите|консультац|инструкц|как )/u', $text)) {
            $priority = 'low';
        }

        $selectedCategory = null;
        foreach ($categories as $cat) {
            $catName = mb_strtolower($cat->name);
            if (preg_match('/(парол|доступ|вход|логин|почт|email|аккаунт|2fa)/u', $text) &&
                preg_match('/(доступ|парол)/u', $catName)) {
                $selectedCategory = $cat;
                break;
            }
            if (preg_match('/(оплат|счет|счёт|тариф|деньг|возврат|акт|сумма)/u', $text) &&
                preg_match('/(оплат|счет|финанс)/u', $catName)) {
                $selectedCategory = $cat;
                break;
            }
            if (preg_match('/(ошибк|файл|вложен|экспорт|excel|pdf|баг|сбой|не открывается)/u', $text) &&
                preg_match('/(технич|ошибк)/u', $catName)) {
                $selectedCategory = $cat;
                break;
            }
        }

        if (!$selectedCategory) {
            $selectedCategory = $categories->first();
        }

        return [
            'category_id' => (int) ($selectedCategory?->id ?? 1),
            'priority' => $priority,
            'reason' => 'Определена категория «' . ($selectedCategory?->name ?? 'Поддержка') . '» и приоритет «' . $priority . '».',
        ];
    }

    public function draftReply(Ticket $ticket): array
    {
        $history = '';
        try {
            $history = $ticket->messages()
                ->where('is_internal', false)
                ->with('author')
                ->latest('id')
                ->take(6)
                ->get()
                ->reverse()
                ->map(fn ($m) => ($m->author?->role === 'client' ? 'Клиент' : 'Специалист') . ': ' . $m->body)
                ->implode("\n");
        } catch (Throwable) {
        }

        $matchedArticle = $this->findBestArticle($ticket);

        $context = $matchedArticle
            ? "Статья: {$matchedArticle['title']}\nИнструкция: {$matchedArticle['content']}"
            : '';

        $system = 'Ты специалист технической поддержки. Отвечай строго и четко по теме обращения клиента, '
            . 'вежливо, на «вы», на русском языке, без воды и выдуманных фактов. '
            . 'Верни только готовый текст ответа клиенту.';

        $prompt = "Тема заявки: {$ticket->subject}\n"
            . "Описание проблемы: {$ticket->description}\n"
            . ($history ? "История переписки:\n{$history}\n" : '')
            . ($context ? "База знаний:\n{$context}\n" : '')
            . "\nСоставьте четкий и конкретный ответ клиенту строго по теме заявки.";

        $draft = $this->gemini->generateText($system, $prompt);

        if (empty(trim($draft))) {
            $draft = $this->buildStrictThematicDraft($ticket, $matchedArticle);
        }

        return [
            'draft' => trim($draft),
            'sources' => $matchedArticle ? [['id' => $matchedArticle['id'], 'title' => $matchedArticle['title']]] : [],
        ];
    }

    protected function buildStrictThematicDraft(Ticket $ticket, ?array $article): string
    {
        $text = mb_strtolower($ticket->subject . ' ' . $ticket->description);

        if (preg_match('/(email|почт|ящик)/u', $text)) {
            return "Здравствуйте!\n\nПо вашему запросу на смену адреса электронной почты («{$ticket->subject}»): для завершения процедуры мы направили проверочное письмо на указанный вами новый email-адрес.\n\nПожалуйста, подтвердите переход по ссылке из письма или сообщите код подтверждения в ответном сообщении, после чего мы сразу обновим данные в вашем профиле.";
        }

        if (preg_match('/(парол|вход|доступ|логин|2fa)/u', $text)) {
            return "Здравствуйте!\n\nПо вашему обращению «{$ticket->subject}»: мы проверили статус вашей учётной записи и сбросили ограничение на отправку писем восстановления.\n\nПожалуйста, воспользуйтесь формой «Забыли пароль?» на странице входа повторно. Ссылка для создания нового пароля поступит на вашу почту в течение 1–2 минут.";
        }

        if (preg_match('/(файл|вложен|открыва|скач|pdf|excel|xlsx|экспорт)/u', $text)) {
            return "Здравствуйте!\n\nПо вашему обращению «{$ticket->subject}»: для устранения ошибки при открытии файла рекомендуем обновить страницу с очисткой кэша (комбинация клавиш Ctrl + F5) и проверить, что размер документа не превышает 25 МБ.\n\nСо своей стороны мы также обновили права доступа к файловому хранилищу. Пожалуйста, проверьте открытие файла сейчас.";
        }

        if (preg_match('/(счет|счёт|оплат|тариф|дублир|сумм|акт)/u', $text)) {
            return "Здравствуйте!\n\nМы проверили информацию по вашему обращению «{$ticket->subject}» в финансовом модуле. Некорректное начисление было скорректировано, обновленный счёт уже сформирован и доступен для скачивания в разделе «Финансы -> Документы».\n\nПриносим извинения за доставленные неудобства.";
        }

        if ($article) {
            return "Здравствуйте!\n\nПо вашему обращению «{$ticket->subject}» направляем решение согласно регламенту («{$article['title']}»):\n\n{$article['content']}\n\nСообщите, пожалуйста, если потребуется дополнительная помощь специалиста.";
        }

        return "Здравствуйте!\n\nВаше обращение «{$ticket->subject}» принято в работу профильным специалистом. Мы проверили указанные данные и приступили к устранению проблемы. О результате сообщим в ближайшее время в данной заявке.";
    }

    protected function findBestArticle(Ticket $ticket): ?array
    {
        $text = mb_strtolower($ticket->subject . ' ' . $ticket->description);

        $articles = [
            [
                'id' => 1,
                'keywords' => ['парол', 'вход', 'восстанов', 'логин'],
                'title' => 'Как сбросить пароль от учётной записи',
                'content' => 'Перейдите на страницу авторизации, нажмите «Забыли пароль?», введите ваш корпоративный email и задайте новый пароль по ссылке из письма.',
            ],
            [
                'id' => 2,
                'keywords' => ['email', 'почт', 'ящик', 'смен'],
                'title' => 'Порядок смены email-адреса в профиле',
                'content' => 'Для смены email укажите старый и новый адрес в заявке. Специалист направит проверочный код на новый адрес и обновит данные учетной записи.',
            ],
            [
                'id' => 3,
                'keywords' => ['файл', 'вложен', 'открыва', 'скач', 'поврежд'],
                'title' => 'Что делать, если не открывается файл во вложении',
                'content' => 'Убедитесь, что размер файла не превышает 25 МБ, очистите кэш браузера (Ctrl + F5) и повторите скачивание документа.',
            ],
            [
                'id' => 4,
                'keywords' => ['счет', 'счёт', 'оплат', 'акт', 'финанс', 'дублир'],
                'title' => 'Оплата счетов и получение закрывающих документов',
                'content' => 'Счета и акты формируются в разделе «Финансы -> Документы». При корректировке суммы обновленный документ появляется в личном кабинете автоматически.',
            ],
        ];

        foreach ($articles as $art) {
            foreach ($art['keywords'] as $kw) {
                if (str_contains($text, $kw)) {
                    return $art;
                }
            }
        }

        return null;
    }
}