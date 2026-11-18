import { z } from 'zod'

const bodySchema = z.object({
    paymentId: z.string().startsWith('mock-'),
    state: z.enum(['succeeded', 'canceled']),
})

/** Тестовая оплата — существует только в режиме разработки (без ЮKassa). */
export default defineEventHandler(async (event) => {
    if (!import.meta.dev) throw createError({ statusCode: 404 })
    await requireUserSession(event)
    const { paymentId, state } = await readValidatedBody(event, validator(bodySchema))
    setMockPaymentState(paymentId, state)
    return { ok: true }
})
