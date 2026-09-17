import { pgTable, pgEnum, text, varchar, serial, integer, smallint, timestamp, unique, primaryKey } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: serial().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    password: text().notNull(),
    avatar: text().notNull(),
    created_at: timestamp().notNull().defaultNow(),
})

export const examLevelEnum = pgEnum('exam_level', ['base', 'profile'])

export const taskTypes = pgTable('task_types', {
    id: serial().primaryKey(),
    number: smallint().notNull(),
    exam_level: examLevelEnum().notNull(),
    name: varchar({ length: 255 }).notNull(),
}, (t) => [
    unique('uq_task_types_number_level').on(t.number, t.exam_level),
])

export const topics = pgTable('topics', {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
})

export const tasks = pgTable('tasks', {
    id: serial().primaryKey(),
    task_type_id: integer().notNull().references(() => taskTypes.id),
    topic_id: integer().references(() => topics.id),
    difficulty: integer().notNull().default(3),
    body: text().notNull(),
    image_url: varchar({ length: 500 }),
    answer: varchar({ length: 255 }).notNull(),
    source: varchar({ length: 255 }),
    created_at: timestamp().notNull().defaultNow(),
})

export const solutions = pgTable('solutions', {
    id: serial().primaryKey(),
    task_id: integer().notNull().references(() => tasks.id),
    body: text().notNull(),
    sort_order: smallint().notNull().default(1),
})

export const tags = pgTable('tags', {
    id: serial().primaryKey(),
    name: varchar({ length: 100 }).notNull().unique(),
})

export const taskTags = pgTable('task_tags', {
    task_id: integer().notNull().references(() => tasks.id),
    tag_id: integer().notNull().references(() => tags.id),
}, (t) => [
    primaryKey({ columns: [t.task_id, t.tag_id] }),
])
