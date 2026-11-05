import { useEffect, useState } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export interface KnowledgeBaseArticle {
  id: number
  title: string
  content: string
}

const STATIC_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: 1,
    title: 'Как сбросить пароль от учётной записи',
    content:
      'Для восстановления доступа к аккаунту:\n1. Перейдите на страницу входа и нажмите «Забыли пароль?».\n2. Введите ваш корпоративный email.\n3. Откройте письмо и перейдите по ссылке для установки нового пароля (не менее 8 символов).\nЕсли письмо не пришло в течение 5 минут, проверьте папку «Спам».',
  },
  {
    id: 2,
    title: 'Порядок смены email-адреса в профиле',
    content:
      'Для изменения привязанного адреса электронной почты создайте заявку в службу поддержки. Укажите старый email и новый адрес. Специалист отправит проверочный код на новую почту и после подтверждения обновит данные профиля.',
  },
  {
    id: 3,
    title: 'Что делать, если не открывается файл во вложении',
    content:
      'Если вложенный документ не скачивается или выдает ошибку:\n1. Убедитесь, что размер файла не превышает 25 МБ, а формат поддерживается (PDF, DOCX, XLSX, PNG, JPG).\n2. Обновите страницу с очисткой кэша (Ctrl + F5).\n3. Попробуйте скачать файл в другом браузере без расширений-блокировщиков.',
  },
  {
    id: 4,
    title: 'Оплата счетов и получение закрывающих документов',
    content:
      'Счета на оплату и акты выполненных работ формируются в разделе «Финансы -> Документы» до 5-го числа каждого месяца. При безналичной оплате зачисление средств и обновление статуса счёта занимает от 1 до 3 рабочих дней.',
  },
  {
    id: 5,
    title: 'Настройка двухфакторной аутентификации (2FA)',
    content:
      'Перейдите в раздел «Профиль -> Безопасность», нажмите «Подключить 2FA» и отсканируйте QR-код с помощью мобильного приложения Google Authenticator. Введите 6-значный код для завершения привязки.',
  },
  {
    id: 6,
    title: 'Как отследить статус обращения в техподдержку',
    content:
      'Все обращения отображаются в разделе «Заявки». Статусы заявок:\n- «Новая»: заявка зарегистрирована.\n- «В работе»: специалист решает вопрос.\n- «Ждёт клиента»: требуется уточнение от автора заявки.\n- «Решена»: проблема устранена.',
  },
]

export function KbPage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>(STATIC_ARTICLES)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api<any>('/kb/articles')
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        if (list.length > 0) {
          setArticles(list)
        }
      })
      .catch(() => {})
  }, [])

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      a.title.toLowerCase().includes(q) ||
      (a.content || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">База знаний</h1>
        <p className="text-muted-foreground">Ответы на частые вопросы</p>
      </div>

      <div className="relative max-w-md">
        <Input
          type="search"
          placeholder="Поиск по статьям"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="size-4" />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((article) => (
            <Card key={article.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BookOpen className="size-4 text-primary" />
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {article.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">Статей не найдено</div>
      )}
    </div>
  )
}

export { KbPage as KnowledgeBasePage }
export default KbPage