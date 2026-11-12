/**
 * Единая настройка базового адреса API (переменная окружения Vite или константа по умолчанию).
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const TOKEN_KEY = 'helpdesk_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

interface Options {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined>
}

/**
 * Общая функция отправки запросов к Laravel API:
 * - добавляет заголовки Accept: application/json, Content-Type: application/json (кроме FormData) и Authorization: Bearer <token>;
 * - для FormData заголовок Content-Type не устанавливается вручную (браузер сам добавляет multipart/form-data с boundary);
 * - при ответе 401 удаляет токен и перенаправляет на страницу входа;
 * - при ответе 422 возвращает объект errors (в ApiError.errors) для вывода в форме;
 * - обрабатывает ошибки бизнес-правил (409), доступа (403), сети (0) и сервера (500+).
 */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(baseUrl + cleanPath, window.location.origin)

  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const token = getToken()
  const isFormData = options.body instanceof FormData

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  // При отправке FormData заголовок Content-Type: application/json НЕ указывается
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('Ошибка сети: не удалось подключиться к серверу API.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    // 401: токен отсутствует, недействителен или просрочен -> удаляем токен и перенаправляем на страницу входа
    if (response.status === 401 && cleanPath !== '/login' && cleanPath !== '/register') {
      clearToken()
      window.dispatchEvent(new Event('auth:expired'))
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login')
      }
    }

    // 422: ошибки валидации полей формы
    if (response.status === 422) {
      throw new ApiError(
        data.message ?? 'Ошибка валидации данных.',
        422,
        data.errors ?? {}
      )
    }

    // 500+: внутренняя ошибка сервера
    if (response.status >= 500) {
      throw new ApiError(
        data.message ?? 'Внутренняя ошибка сервера (500). Попробуйте позже.',
        response.status
      )
    }

    throw new ApiError(data.message ?? 'Ошибка выполнения запроса.', response.status, data.errors)
  }

  return data as T
}

/** Формирует полный URL для отображения/скачивания вложения из хранилища Laravel Storage. */
export function getAttachmentUrl(att: { url?: string | null; path?: string }): string {
  if (att.url) return att.url
  const origin = API_BASE_URL.replace(/\/api\/?$/, '')
  const cleanPath = (att.path ?? '').replace(/^\/+/, '')
  return `${origin}/storage/${cleanPath}`
}

/** Скачивание CSV-отчёта по заявкам с передачей Bearer-токена. */
export async function downloadTicketsCsv(
  query: Record<string, string | number | undefined> = {}
): Promise<void> {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const url = new URL(`${baseUrl}/tickets/export/csv`, window.location.origin)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), { headers })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(data.message ?? 'Не удалось скачать CSV-отчёт.', response.status)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = 'tickets_export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

/** Текст ошибки для пользователя: первая ошибка валидации или общее сообщение. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const first = error.errors ? Object.values(error.errors)[0]?.[0] : undefined
    return first ?? error.message
  }
  return 'Не удалось выполнить запрос к серверу'
}
