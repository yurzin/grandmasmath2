import { and, between, eq, gt, isNull, ne } from 'drizzle-orm'

const REMIND_BEFORE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Раз в день: письмо тем, у кого доступ по подписке заканчивается в ближайшие 3 дня.
 * Напоминаем один раз — по последнему оплаченному периоду (если уже продлили, писать не о чем).
 */
export default defineTask({
    meta: { name: 'subscriptions:remind', description: 'Напоминания об окончании подписки' },
    async run() {
        const now = new Date()
        const ending = await db
            .select({ purchase: schema.purchases, email: schema.users.email })
            .from(schema.purchases)
            .innerJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
            .where(and(
                eq(schema.purchases.kind, 'subscription'),
                eq(schema.purchases.status, 'succeeded'),
                isNull(schema.purchases.reminderSentAt),
                between(schema.purchases.accessUntil, now, new Date(now.getTime() + REMIND_BEFORE_MS)),
            ))

        const { siteUrl } = useRuntimeConfig()
        const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' })
        let sent = 0
        for (const { purchase, email } of ending) {
            // ne(id) обязателен: в БД время с микросекундами, в JS — с миллисекундами,
            // и без него период «позже самого себя» находился бы всегда.
            const [later] = await db.select({ id: schema.purchases.id }).from(schema.purchases)
                .where(and(
                    eq(schema.purchases.userId, purchase.userId),
                    eq(schema.purchases.kind, 'subscription'),
                    eq(schema.purchases.status, 'succeeded'),
                    ne(schema.purchases.id, purchase.id),
                    gt(schema.purchases.accessUntil, purchase.accessUntil!),
                ))
                .limit(1)
            if (!later) {
                const until = dateFormat.format(purchase.accessUntil!)
                await sendMail({
                    to: email,
                    subject: `Подписка на сборники заканчивается ${until}`,
                    text: [
                        // until уже заканчивается на «г.» — своя точка не нужна.
                        `Доступ ко всем сборникам и решениям по вашей подписке действует до ${until}`,
                        '',
                        `Продлить: ${siteUrl}/subscription`,
                        '',
                        'Продление добавится к текущему сроку — ничего не потеряется.',
                    ].join('\n'),
                })
                sent++
            }
            // Помечаем и тогда, когда уже продлили, — чтобы не проверять снова.
            await db.update(schema.purchases).set({ reminderSentAt: now }).where(eq(schema.purchases.id, purchase.id))
        }
        return { result: { checked: ending.length, sent } }
    },
})
