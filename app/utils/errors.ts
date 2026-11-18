/** Текст ошибки из ответа $fetch: первая ошибка валидации zod, затем message сервера, иначе запасной. */
export function errorMessage(e: unknown, fallback = 'Ошибка') {
    const data = (e as { data?: { statusMessage?: string, message?: string, data?: { issues?: { message: string }[] } } })?.data
    const issue = data?.data?.issues?.[0]?.message
    return issue ?? data?.message ?? data?.statusMessage ?? fallback
}
