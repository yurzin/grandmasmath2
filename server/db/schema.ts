import { pgTable, pgEnum, text, varchar, serial, integer, smallint, timestamp, unique, primaryKey } from 'drizzle-orm/pg-core'

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
