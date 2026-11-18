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
}

export interface TaskCollectionRef {
    slug: string
    title: string
    position: number
}

export interface TaskDetail {
    id: number
    title: string
    label: string
    bodyHtml: string
    /** Ответ и решения закрыты (платная задача сборника) — answerHtml null, solutionsHtml пуст. */
    locked: boolean
    /** «Реши сам»: у задачи есть ключ ответа и она доступна текущему пользователю. */
    checkable: boolean
    /** Текущий пользователь уже решил её верно. */
    solved: boolean
    answerHtml: string | null
    solutionsHtml: string[]
    difficulty: number
    topic: string | null
    taskType: string
    examLevel: ExamLevel
    imageUrl: string | null
    collection: TaskCollectionRef | null
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
    kind: 'collection' | 'subscription'
    status: 'pending' | 'succeeded' | 'canceled'
    amount: number
    createdAt: string
    paidAt: string | null
    /** Для покупки сборника. */
    collection: { slug: string, title: string } | null
    /** Для подписки: срок и оплаченный период. */
    months: number | null
    accessFrom: string | null
    accessUntil: string | null
    /** Ссылка, чтобы вернуться к незавершённой оплате. */
    confirmationUrl: string | null
}

export interface SubscriptionInfo {
    plans: { id: number, months: number, price: number }[]
    /** До какого момента у текущего пользователя есть доступ по подписке. */
    activeUntil: string | null
}

export interface CollectionDetail extends Omit<CollectionCard, 'taskCount'> {
    id: number
    /** Текущий пользователь уже купил сборник (id оплаченной покупки). */
    purchaseId: number | null
    /** У текущего пользователя действует подписка — до этого момента. */
    subscriptionUntil: string | null
    tasks: {
        id: number
        position: number
        title: string | null
        isFree: boolean
        /** Текущий пользователь решил задачу в режиме «реши сам». */
        solved: boolean
    }[]
}
