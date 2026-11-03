const BASE_URL = 'http://127.0.0.1:8000/api/v1'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | undefined>
  body?: any
}

export async function api<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { query, headers, body, ...rest } = options

  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  if (query) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const queryString = params.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  const userId = localStorage.getItem('helpdesk_user_id')
  const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : body,
    ...rest,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    let message = errorData?.message || `Ошибка сервера: ${response.status}`

    if (errorData?.errors) {
      const details = Object.values(errorData.errors).flat().join('. ')
      if (details) message = details
    }

    throw new Error(message)
  }

  // Для статуса 204 No Content или пустого ответа возвращаем пустой объект без вызова .json()
  if (response.status === 204) {
    return {} as T
  }

  const text = await response.text()
  return text ? JSON.parse(text) : ({} as T)
}

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Неизвестная ошибка'
}