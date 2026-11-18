import { pgTable, pgEnum, text, varchar, serial, integer, smallint, boolean, timestamp, unique, index, primaryKey } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const users = pgTable('users', {
    id: serial().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    // scrypt-хеш (server/lib/password.ts); null — вход без пароля (по ссылке на email, этап 4).
    password: text(),
    avatar: text(),
    role: userRoleEnum().notNull().default('user'),
    createdAt: timestamp().notNull().defaultNow(),
})

export const examLevelEnum = pgEnum('exam_level', ['base', 'profile'])

export const taskTypes = pgTable('task_types', {
    id: serial().primaryKey(),
    number: smallint().notNull(),
    examLevel: examLevelEnum().notNull(),
    name: varchar({ length: 255 }).notNull(),
}, (t) => [
    unique('uq_task_types_number_level').on(t.number, t.examLevel),
])

export const topics = pgTable('topics', {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
})

export const tasks = pgTable('tasks', {
    id: serial().primaryKey(),
    taskTypeId: integer().notNull().references(() => taskTypes.id),
    topicId: integer().references(() => topics.id),
    difficulty: integer().notNull().default(3),
    title: varchar({ length: 255 }),
    // Условие и решения хранятся в Markdown с формулами LaTeX ($…$, $$…$$).
    body: text().notNull(),
    imageUrl: varchar({ length: 500 }),
    answer: varchar({ length: 255 }).notNull(),
    /** Ответ для проверки в режиме «реши сам»: допустимые значения через «;» (числа или короткий текст). */
    answerKey: varchar({ length: 255 }),
    source: varchar({ length: 255 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
})

export const solutions = pgTable('solutions', {
    id: serial().primaryKey(),
    taskId: integer().notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    sortOrder: smallint().notNull().default(1),
})

export const collectionStatusEnum = pgEnum('collection_status', ['draft', 'published', 'archived'])

export const collections = pgTable('collections', {
    id: serial().primaryKey(),
    slug: varchar({ length: 255 }).notNull().unique(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    // Цена в рублях; null — цена ещё не назначена.
    price: integer(),
    status: collectionStatusEnum().notNull().default('draft'),
    version: integer().notNull().default(1),
    coverUrl: varchar({ length: 500 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
})

export const collectionTasks = pgTable('collection_tasks', {
    collectionId: integer().notNull().references(() => collections.id, { onDelete: 'cascade' }),
    taskId: integer().notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    // Бесплатные (демо) задачи сборника открыты всем, остальные — после покупки (этап 4).
    isFree: boolean().notNull().default(false),
}, (t) => [
    primaryKey({ columns: [t.collectionId, t.taskId] }),
    unique('uq_collection_tasks_position').on(t.collectionId, t.position),
])

export const tags = pgTable('tags', {
    id: serial().primaryKey(),
    name: varchar({ length: 100 }).notNull().unique(),
})

export const taskTags = pgTable('task_tags', {
    taskId: integer().notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: integer().notNull().references(() => tags.id),
}, (t) => [
    primaryKey({ columns: [t.taskId, t.tagId] }),
])

// ---------- Вход по email (этап 4) ----------

/** Одноразовый код/ссылка для входа. Хранятся только хеши. */
export const loginTokens = pgTable('login_tokens', {
    id: serial().primaryKey(),
    email: text().notNull(),
    codeHash: text().notNull(),
    linkHash: text().notNull().unique(),
    attempts: smallint().notNull().default(0),
    expiresAt: timestamp().notNull(),
    usedAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
}, t => [
    index('idx_login_tokens_email').on(t.email),
])

// ---------- Покупки: сборники (этап 4) и подписка (этап 5) ----------

/** Тарифы подписки «доступ ко всем сборникам на срок». */
export const subscriptionPlans = pgTable('subscription_plans', {
    id: serial().primaryKey(),
    months: smallint().notNull().unique(),
    /** Цена в рублях. */
    price: integer().notNull(),
    /** Выключенный тариф не продаётся. */
    active: boolean().notNull().default(false),
})

export const purchaseKindEnum = pgEnum('purchase_kind', ['collection', 'subscription'])
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'succeeded', 'canceled'])

export const purchases = pgTable('purchases', {
    id: serial().primaryKey(),
    userId: integer().notNull().references(() => users.id),
    kind: purchaseKindEnum().notNull().default('collection'),
    /** Для kind = 'collection'. */
    collectionId: integer().references(() => collections.id),
    status: purchaseStatusEnum().notNull().default('pending'),
    /** Сумма в рублях на момент покупки. */
    amount: integer().notNull(),
    /** Платёжный провайдер ('yookassa' | 'mock') и id платежа у него. */
    provider: varchar({ length: 20 }).notNull(),
    paymentId: varchar({ length: 100 }).unique(),
    confirmationUrl: text(),
    collectionVersion: integer(),
    downloadCount: integer().notNull().default(0),
    /** Подписка: срок в месяцах; период доступа считается в момент оплаты (продление — с конца текущего). */
    months: smallint(),
    accessFrom: timestamp(),
    accessUntil: timestamp(),
    /** Когда отправили напоминание о скором окончании подписки. */
    reminderSentAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
    paidAt: timestamp(),
}, t => [
    index('idx_purchases_user').on(t.userId),
])

// ---------- «Реши сам» (этап 5) ----------

/** Попытки ответа вошедших пользователей — для отметок «решено» и прогресса. */
export const attempts = pgTable('attempts', {
    id: serial().primaryKey(),
    userId: integer().notNull().references(() => users.id, { onDelete: 'cascade' }),
    taskId: integer().notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    answer: varchar({ length: 255 }).notNull(),
    correct: boolean().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
}, t => [
    index('idx_attempts_user_task').on(t.userId, t.taskId),
])
