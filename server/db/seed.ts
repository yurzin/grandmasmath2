// @ts-nocheck
process.loadEnvFile('.env')

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { topics, taskTypes, tasks, solutions, tags, taskTags } from './schema'

const sql = postgres(process.env.DATABASE_URL)
const db = drizzle(sql, { casing: 'snake_case' })

async function main() {
    console.log('Seeding topics...')
    const topicRows = await db.insert(topics).values([
        { name: 'Текстовые задачи', slug: 'text-problems' },
        { name: 'Графики и диаграммы', slug: 'graphs' },
        { name: 'Планиметрия', slug: 'planimetry' },
        { name: 'Теория вероятностей', slug: 'probability' },
        { name: 'Уравнения', slug: 'equations' },
        { name: 'Производная', slug: 'derivative' },
        { name: 'Стереометрия', slug: 'stereometry' },
        { name: 'Исследование функций', slug: 'function-analysis' },
    ]).returning()
    const topic = Object.fromEntries(topicRows.map(t => [t.slug, t.id]))

    console.log('Seeding task types...')
    const taskTypeRows = await db.insert(taskTypes).values([
        { number: 1, examLevel: 'profile', name: 'Задачи на проценты и практические расчёты' },
        { number: 2, examLevel: 'profile', name: 'Анализ графиков и диаграмм' },
        { number: 3, examLevel: 'profile', name: 'Планиметрия: базовые задачи по рисунку' },
        { number: 4, examLevel: 'profile', name: 'Теория вероятностей' },
        { number: 5, examLevel: 'profile', name: 'Простейшие уравнения' },
        { number: 7, examLevel: 'profile', name: 'Производная и физический смысл' },
        { number: 8, examLevel: 'profile', name: 'Стереометрия' },
        { number: 12, examLevel: 'profile', name: 'Наибольшее и наименьшее значение функции' },
        { number: 1, examLevel: 'base', name: 'Арифметические вычисления' },
        { number: 5, examLevel: 'base', name: 'Простейшие текстовые задачи' },
    ]).returning()
    const type = (number: number, level: 'base' | 'profile') =>
        taskTypeRows.find(t => t.number === number && t.examLevel === level).id

    console.log('Seeding tags...')
    const tagRows = await db.insert(tags).values([
        { name: 'база' },
        { name: 'профиль' },
        { name: 'вычисления' },
        { name: 'геометрия' },
        { name: 'вероятность' },
        { name: 'текстовая-задача' },
        { name: 'производная' },
        { name: 'уравнения' },
    ]).returning()
    const tag = Object.fromEntries(tagRows.map(t => [t.name, t.id]))

    const taskDefs = [
        {
            taskTypeId: type(1, 'profile'), topicId: topic['text-problems'], difficulty: 1,
            body: 'Билет на автобус стоит 55 рублей. Школьникам предоставляется скидка 40%. Сколько рублей стоит билет для школьника?',
            answer: '33',
            source: 'Тренировочный банк заданий',
            tagNames: ['текстовая-задача', 'профиль'],
            steps: [
                'Скидка составляет 40% от 55 рублей: 55 · 0,4 = 22 рубля.',
                'Цена билета со скидкой: 55 − 22 = 33 рубля.',
            ],
        },
        {
            taskTypeId: type(1, 'profile'), topicId: topic['text-problems'], difficulty: 2,
            body: 'Оптовая цена учебника 260 рублей. Розничная цена на 15% выше оптовой. Найдите розничную цену учебника в рублях.',
            answer: '299',
            source: 'Тренировочный банк заданий',
            tagNames: ['текстовая-задача', 'профиль'],
            steps: [
                'Наценка составляет 15% от 260 рублей: 260 · 0,15 = 39 рублей.',
                'Розничная цена: 260 + 39 = 299 рублей.',
            ],
        },
        {
            taskTypeId: type(2, 'profile'), topicId: topic['graphs'], difficulty: 2,
            body: 'Среднемесячные продажи товара по месяцам (в тыс. руб.): январь — 120, февраль — 95, март — 140, апрель — 160, май — 130. Укажите наибольшее значение продаж среди перечисленных месяцев (в тыс. руб.).',
            answer: '160',
            source: 'Тренировочный банк заданий',
            tagNames: ['вычисления', 'профиль'],
            steps: [
                'Сравниваем значения продаж по месяцам: 120, 95, 140, 160, 130.',
                'Наибольшее значение — 160 тыс. руб., оно достигается в апреле.',
            ],
        },
        {
            taskTypeId: type(3, 'profile'), topicId: topic['planimetry'], difficulty: 3,
            body: 'В прямоугольном треугольнике катеты равны 6 и 8. Найдите гипотенузу этого треугольника.',
            answer: '10',
            source: 'Тренировочный банк заданий',
            tagNames: ['геометрия', 'профиль'],
            steps: [
                'По теореме Пифагора гипотенуза c = √(6² + 8²) = √(36 + 64) = √100 = 10.',
            ],
        },
        {
            taskTypeId: type(3, 'profile'), topicId: topic['planimetry'], difficulty: 3,
            body: 'Площадь треугольника равна 48. Основание треугольника равно 12. Найдите высоту, проведённую к этому основанию.',
            answer: '8',
            source: 'Тренировочный банк заданий',
            tagNames: ['геометрия', 'профиль'],
            steps: [
                'Площадь треугольника S = (1/2)·a·h, откуда h = 2S/a.',
                'h = 2 · 48 / 12 = 8.',
            ],
        },
        {
            taskTypeId: type(4, 'profile'), topicId: topic['probability'], difficulty: 2,
            body: 'В магазине продаются пакеты сока одного объёма, но разных производителей. Всего в продаже 20 пакетов, из них 5 пакетов сока производителя А. Найдите вероятность того, что случайно выбранный пакет сока окажется произведён не производителем А.',
            answer: '0.75',
            source: 'Тренировочный банк заданий',
            tagNames: ['вероятность', 'профиль'],
            steps: [
                'Число пакетов других производителей: 20 − 5 = 15.',
                'Вероятность: 15 / 20 = 0,75.',
            ],
        },
        {
            taskTypeId: type(5, 'profile'), topicId: topic['equations'], difficulty: 2,
            body: 'Найдите корень уравнения: log₂(3x − 5) = 4.',
            answer: '7',
            source: 'Тренировочный банк заданий',
            tagNames: ['уравнения', 'профиль'],
            steps: [
                'По определению логарифма: 3x − 5 = 2⁴ = 16.',
                '3x = 21, x = 7. Проверка: 3·7 − 5 = 16 > 0 — корень подходит.',
            ],
        },
        {
            taskTypeId: type(5, 'profile'), topicId: topic['equations'], difficulty: 2,
            body: 'Найдите корень уравнения: 5^(x+1) = 125.',
            answer: '2',
            source: 'Тренировочный банк заданий',
            tagNames: ['уравнения', 'профиль'],
            steps: [
                '125 = 5³, поэтому 5^(x+1) = 5³.',
                'Отсюда x + 1 = 3, значит x = 2.',
            ],
        },
        {
            taskTypeId: type(7, 'profile'), topicId: topic['derivative'], difficulty: 4,
            body: 'Материальная точка движется прямолинейно по закону x(t) = t³ − 3t² − 45t + 10, где x — расстояние от точки отсчёта в метрах, t — время в секундах. Найдите скорость точки (в м/с) в момент времени t = 5 с.',
            answer: '0',
            source: 'Тренировочный банк заданий',
            tagNames: ['производная', 'профиль'],
            steps: [
                'Скорость — производная координаты по времени: v(t) = x\'(t) = 3t² − 6t − 45.',
                'Подставим t = 5: v(5) = 3·25 − 6·5 − 45 = 75 − 30 − 45 = 0 (м/с).',
            ],
        },
        {
            taskTypeId: type(8, 'profile'), topicId: topic['stereometry'], difficulty: 4,
            body: 'Объём куба равен 64. Найдите площадь поверхности этого куба.',
            answer: '96',
            source: 'Тренировочный банк заданий',
            tagNames: ['геометрия', 'профиль'],
            steps: [
                'Сторона куба a = ∛64 = 4.',
                'Площадь полной поверхности куба S = 6a² = 6·16 = 96.',
            ],
        },
        {
            taskTypeId: type(12, 'profile'), topicId: topic['function-analysis'], difficulty: 5,
            body: 'Найдите наибольшее значение функции y = x³ − 3x² − 45x + 5 на отрезке [−4; 0].',
            answer: '86',
            source: 'Тренировочный банк заданий',
            tagNames: ['производная', 'профиль'],
            steps: [
                'Найдём производную: y\' = 3x² − 6x − 45 = 3(x − 5)(x + 3).',
                'На отрезке [−4; 0] производная обращается в нуль при x = −3 (точка x = 5 не входит в отрезок).',
                'Вычислим значения функции на концах отрезка и в критической точке: y(−4) = 73, y(−3) = 86, y(0) = 5. Наибольшее значение равно 86.',
            ],
        },
        {
            taskTypeId: type(1, 'base'), topicId: topic['text-problems'], difficulty: 1,
            body: 'Найдите значение выражения 2,7 · 4 − 3,2.',
            answer: '7.6',
            source: 'Тренировочный банк заданий',
            tagNames: ['вычисления', 'база'],
            steps: [
                '2,7 · 4 = 10,8.',
                '10,8 − 3,2 = 7,6.',
            ],
        },
        {
            taskTypeId: type(5, 'base'), topicId: topic['text-problems'], difficulty: 1,
            body: 'Клиент взял в банке кредит 10000 рублей на год под 12% годовых. Он должен погасить кредит, заплатив банку 10000 рублей и проценты за пользование кредитом. Сколько рублей клиент должен заплатить банку?',
            answer: '11200',
            source: 'Тренировочный банк заданий',
            tagNames: ['текстовая-задача', 'база'],
            steps: [
                'Проценты за год: 10000 · 0,12 = 1200 рублей.',
                'Общая сумма выплаты: 10000 + 1200 = 11200 рублей.',
            ],
        },
    ]

    console.log(`Seeding ${taskDefs.length} tasks with solutions...`)
    for (const def of taskDefs) {
        const [task] = await db.insert(tasks).values({
            taskTypeId: def.taskTypeId,
            topicId: def.topicId,
            difficulty: def.difficulty,
            body: def.body,
            answer: def.answer,
            source: def.source,
        }).returning()

        await db.insert(solutions).values(
            def.steps.map((body, i) => ({ taskId: task.id, body, sortOrder: i + 1 })),
        )

        if (def.tagNames.length) {
            await db.insert(taskTags).values(
                def.tagNames.map(name => ({ taskId: task.id, tagId: tag[name] })),
            )
        }
    }

    console.log('Done.')
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => sql.end())
