import { pgTable, pgEnum, text, varchar, serial, integer, smallint, boolean, timestamp, unique, primaryKey } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: serial().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    password: text().notNull(),
    avatar: text().notNull(),
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
    source: varchar({ length: 255 }),
    createdAt: timestamp().notNull().defaultNow(),
})

export const solutions = pgTable('solutions', {
    id: serial().primaryKey(),
    taskId: integer().notNull().references(() => tasks.id),
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
    taskId: integer().notNull().references(() => tasks.id),
    tagId: integer().notNull().references(() => tags.id),
}, (t) => [
    primaryKey({ columns: [t.taskId, t.tagId] }),
])
