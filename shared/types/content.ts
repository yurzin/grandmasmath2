// Типы ответов API, общие для app/ и server/ (автоимпорт Nuxt из shared/types).

export type ExamLevel = 'base' | 'profile'

export interface TaskCard {
    id: number
    /** Заголовок задачи (если задан) или номер ЕГЭ с темой. */
    title: string
    /** Номер ЕГЭ и тема, например «№16 (профиль) · Финансовая математика». */
    label: string
    /** HTML первого абзаца условия. */
    excerptHtml: string
    /** Бесплатная (ответ и решение открыты всем). */
    isFree: boolean
}

export interface TaskCollectionRef {
    slug: string
    title: string
    position: number
    /** Всего задач в сборнике и соседние задачи — для навигации «← 2 · 3 · 4 →». */
    total: number
    prevTaskId: number | null
    nextTaskId: number | null
}

export interface TaskDetail {
    id: number
    title: string
    label: string
    bodyHtml: string
    /** Ответ и решения закрыты (платная задача сборника) — answerHtml null, solutionsHtml пуст. */
    locked: boolean
    /** Задача открыта по короткому доступу; пока revealed = false, ответ и решения не переданы. */
    pass: TaskPassState | null
    /** «Реши сам»: у задачи есть ключ ответа и она доступна текущему пользователю. */
    checkable: boolean
    /** Текущий пользователь уже решил её верно. */
    solved: boolean
    answerHtml: string | null
    solutionsHtml: string[]
    /** Номер задания ЕГЭ и его название («Экономическая задача»). */
    taskNumber: number
    taskType: string
    examLevel: ExamLevel
    imageUrl: string | null
    collection: TaskCollectionRef | null
}

export interface TaskPassState {
    /** Решение уже открыто в эти сутки — ответ и решения переданы. */
    revealed: boolean
    /** Разных решений открыто за последние сутки и лимит (null — без лимита). */
    used: number
    limit: number | null
    /** До какого момента действует доступ. */
    until: string
    /** Email покупателя для водяного знака поверх решения. */
    watermark: string
}

export interface TaskRevealResult {
    answerHtml: string
    solutionsHtml: string[]
    /** Для короткого доступа — сколько решений открыто за сутки после этого. */
    quota: { used: number, limit: number | null } | null
}

export interface CollectionCard {
    slug: string
    title: string
    description: string | null
    /** Цена в рублях; null — не назначена. */
    price: number | null
    coverUrl: string | null
    taskCount: number
}

export interface PurchaseItem {
    id: number
    kind: 'collection' | 'subscription' | 'pass'
    status: 'pending' | 'succeeded' | 'canceled'
    amount: number
    createdAt: string
    paidAt: string | null
    /** Для покупки сборника. */
    collection: { slug: string, title: string } | null
    /** Для подписки: срок и оплаченный период; для короткого доступа — срок в днях и лимит решений за сутки. */
    months: number | null
    days: number | null
    dailyLimit: number | null
    accessFrom: string | null
    accessUntil: string | null
    /** Ссылка, чтобы вернуться к незавершённой оплате. */
    confirmationUrl: string | null
}

export interface SubscriptionInfo {
    /** Подписка на месяцы: решения и PDF без ограничений. */
    plans: { id: number, months: number, price: number }[]
    /** Короткий доступ на дни: решения только на сайте, не больше dailyLimit новых за сутки. */
    passes: { id: number, days: number, dailyLimit: number | null, price: number }[]
    /** До какого момента у текущего пользователя есть доступ по подписке. */
    activeUntil: string | null
    /** До какого момента действует короткий доступ (с учётом оплаченных продлений). */
    passUntil: string | null
}

export interface CollectionDetail extends Omit<CollectionCard, 'taskCount'> {
    id: number
    /** Текущий пользователь уже купил сборник (id оплаченной покупки). */
    purchaseId: number | null
    /** У текущего пользователя действует подписка — до этого момента. */
    subscriptionUntil: string | null
    /** Действует короткий доступ (решения на сайте, без PDF) — до этого момента. */
    passUntil: string | null
    tasks: {
        id: number
        position: number
        title: string | null
        isFree: boolean
        /** Текущий пользователь решил задачу в режиме «реши сам». */
        solved: boolean
    }[]
}
