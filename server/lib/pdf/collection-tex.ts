// Данные сборника → файлы для XeLaTeX (meta.tex, cover.tex, tasks.tex). Без БД и ввода-вывода.
import { escapeLatex, markdownInlineToLatex, markdownToLatex } from './markdown-to-latex'
import { plural } from '../../../shared/utils/plural'

export interface PdfTask {
    position: number
    title: string | null
    taskTypeNumber: number
    taskTypeName: string
    examLevel: 'base' | 'profile'
    body: string
    answer: string
    solutions: string[]
}

export interface PdfCollection {
    slug: string
    title: string
    tasks: PdfTask[]
}

export interface PdfTemplate {
    main: string
    /** Титульный лист сборника или null — тогда covers/default.tex. */
    cover: string | null
    defaultCover: string
}

export function buildCollectionTex(collection: PdfCollection, template: PdfTemplate, year = new Date().getFullYear()) {
    const warnings: string[] = []
    const conv = (r: { latex: string, warnings: string[] }, where: string) => {
        warnings.push(...r.warnings.map(w => `${where}: ${w}`))
        return r.latex
    }

    const meta = [
        `\\newcommand{\\CollectionTitle}{${escapeLatex(collection.title)}}`,
        `\\newcommand{\\CollectionFooter}{${escapeLatex(collection.title)}}`,
        `\\newcommand{\\CollectionYear}{${year}}`,
        `\\newcommand{\\TaskCountText}{${plural(collection.tasks.length, ['вариант', 'варианта', 'вариантов'])}}`,
    ].join('\n')

    const tasks = collection.tasks.map((t) => {
        const where = `Вариант ${t.position}`
        const level = t.examLevel === 'base' ? ' (БАЗА)' : ''
        const header = escapeLatex(`ЕГЭ ПО МАТЕМАТИКЕ${level} · ${t.taskTypeName.toUpperCase()} № ${t.taskTypeNumber}`)
        const title = escapeLatex(t.title ?? t.taskTypeName)
        const parts = [
            `% ---------- ${where} ----------`,
            `\\task{${header}}{${where}}{${title}}`,
            `\\begin{uslovie}\n${conv(markdownToLatex(t.body), `${where}, условие`)}\n\\end{uslovie}`,
            ...t.solutions.map((s, i) =>
                `${i === 0 ? '\\reshenie' : '\\drugoe'}\n${conv(markdownToLatex(s), `${where}, решение ${i + 1}`)}`),
            `\\otvet{${conv(markdownInlineToLatex(t.answer), `${where}, ответ`)}}`,
        ]
        return parts.join('\n\n')
    }).join('\n\n')

    return {
        files: {
            'main.tex': template.main,
            'meta.tex': meta,
            'cover.tex': template.cover ?? template.defaultCover,
            'tasks.tex': tasks,
        },
        warnings,
    }
}
