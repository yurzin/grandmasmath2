/**
 * Markdown (+ формулы $…$ / $$…$$) → LaTeX для шаблона server/pdf-template.
 * Разбор — тот же markdown-it, что и на сайте; формулы переносятся без изменений,
 * весь обычный текст экранируется, поэтому сырой LaTeX может прийти только из формул.
 */
import MarkdownIt from 'markdown-it'
import { tex } from '@mdit/plugin-tex'

const md = new MarkdownIt({ html: true, linkify: false, typographer: false })
    .use(tex, { delimiters: 'dollars', render: () => '' })

type Token = ReturnType<typeof md.parse>[number]

const DISPLAY_ENV_RE = /^\\begin\{(gather|align|multline|equation|alignat|flalign)\*?\}/

export interface LatexResult {
    latex: string
    warnings: string[]
}

export function markdownToLatex(source: string): LatexResult {
    const warnings: string[] = []
    const latex = renderBlocks(md.parse(source, {}), warnings)
    return { latex, warnings }
}

export function markdownInlineToLatex(source: string): LatexResult {
    const warnings: string[] = []
    const tokens = md.parseInline(source, {})
    const latex = tokens.map(t => renderInline(t.children ?? [], warnings)).join('')
    return { latex, warnings }
}

const TEXT_ESCAPES: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    '$': '\\$',
    '&': '\\&',
    '#': '\\#',
    '%': '\\%',
    '_': '\\_',
    '^': '\\^{}',
    '~': '\\textasciitilde{}',
    '\u00A0': '~', // неразрывный пробел
    '\u202F': '\\,', // узкий неразрывный (разряды, «т. е.»)
}

export function escapeLatex(text: string) {
    return text.replace(/[\\{}$&#%_^~\u00A0\u202F]/g, ch => TEXT_ESCAPES[ch]!)
}

function renderInline(tokens: Token[], warnings: string[]): string {
    let out = ''
    for (const t of tokens) {
        switch (t.type) {
            case 'text': out += escapeLatex(t.content); break
            case 'softbreak': out += '\n'; break
            case 'hardbreak': out += '\\newline\n'; break
            case 'math_inline': out += `$${t.content}$`; break
            case 'strong_open': out += '\\textbf{'; break
            case 'em_open': out += '\\emph{'; break
            case 'strong_close':
            case 'em_close': out += '}'; break
            case 'code_inline': out += `\\texttt{${escapeLatex(t.content)}}`; break
            case 'link_open':
            case 'link_close': break // текст ссылки остаётся, адрес — нет
            case 'html_inline':
                if (/^<br\s*\/?>$/i.test(t.content)) out += '\\newline '
                else warnings.push(`HTML пропущен: ${t.content}`)
                break
            case 'image': warnings.push(`Картинка в тексте пропущена: ${t.attrGet('src')}`); break
            default: warnings.push(`Неизвестный элемент: ${t.type}`)
        }
    }
    return out
}

interface Block { latex: string, math?: boolean }

/** Склейка блоков: вокруг выключных формул — без пустой строки (иначе лишний абзац в LaTeX). */
function joinBlocks(blocks: Block[]) {
    return blocks.reduce((acc, b, i) => {
        if (i === 0) return b.latex
        const sep = b.math || blocks[i - 1]!.math ? '\n' : '\n\n'
        return acc + sep + b.latex
    }, '')
}

function renderBlocks(tokens: Token[], warnings: string[]): string {
    const blocks: Block[] = []
    let i = 0

    // Находит закрывающий токен для открывающего на позиции start.
    const findClose = (start: number) => {
        const open = tokens[start]!
        const closeType = open.type.replace(/_open$/, '_close')
        let depth = 0
        for (let j = start; j < tokens.length; j++) {
            if (tokens[j]!.type === open.type) depth++
            else if (tokens[j]!.type === closeType && --depth === 0) return j
        }
        throw new Error(`Не закрыт ${open.type}`)
    }

    while (i < tokens.length) {
        const t = tokens[i]!
        switch (t.type) {
            case 'paragraph_open': {
                blocks.push({ latex: renderInline(tokens[i + 1]!.children ?? [], warnings) })
                i += 3
                continue
            }
            case 'heading_open': {
                blocks.push({ latex: `\\podzag{${renderInline(tokens[i + 1]!.children ?? [], warnings)}}` })
                i += 3
                continue
            }
            case 'math_block': {
                const content = t.content.trim()
                blocks.push({ math: true, latex: DISPLAY_ENV_RE.test(content) ? content : `\\[\n${content}\n\\]` })
                break
            }
            case 'bullet_list_open':
            case 'ordered_list_open': {
                const close = findClose(i)
                blocks.push({ latex: renderList(tokens.slice(i, close + 1), warnings) })
                i = close + 1
                continue
            }
            case 'table_open': {
                const close = findClose(i)
                blocks.push({ latex: renderTable(tokens.slice(i, close + 1), warnings) })
                i = close + 1
                continue
            }
            case 'hr': blocks.push({ latex: '\\medskip\\noindent{\\color{rulegray}\\rule{\\linewidth}{0.4pt}}\\medskip' }); break
            case 'fence':
                // Рисунок TikZ — в LaTeX как есть (tikz подключён в шаблоне).
                if (t.info.trim() === 'tikz') {
                    blocks.push({ latex: `\\begin{center}\n${t.content.trim()}\n\\end{center}` })
                    break
                }
                blocks.push({ latex: `\\begin{verbatim}\n${t.content.replace(/\\end\{verbatim\}/g, '')}\\end{verbatim}` })
                break
            case 'code_block':
                blocks.push({ latex: `\\begin{verbatim}\n${t.content.replace(/\\end\{verbatim\}/g, '')}\\end{verbatim}` })
                break
            case 'html_block': warnings.push(`HTML-блок пропущен: ${t.content.slice(0, 40)}`); break
            default: warnings.push(`Неизвестный блок: ${t.type}`)
        }
        i++
    }
    return joinBlocks(blocks)
}

function renderList(tokens: Token[], warnings: string[]) {
    const open = tokens[0]!
    const env = open.type === 'ordered_list_open' ? 'enumerate' : 'itemize'
    const start = Number(open.attrGet('start') ?? 1)
    const items: string[] = []

    let depth = 0
    let itemStart = -1
    for (let j = 1; j < tokens.length - 1; j++) {
        const t = tokens[j]!
        if (t.type === 'list_item_open' && depth++ === 0) itemStart = j + 1
        else if (t.type === 'list_item_close' && --depth === 0) {
            items.push(`\\item ${renderBlocks(tokens.slice(itemStart, j), warnings)}`)
        }
    }
    const counter = env === 'enumerate' && start !== 1 ? `\\setcounter{enumi}{${start - 1}}\n` : ''
    return `\\begin{${env}}\n${counter}${items.join('\n')}\n\\end{${env}}`
}

function renderTable(tokens: Token[], warnings: string[]) {
    const rows: { cells: string[], header: boolean }[] = []
    let inHead = false
    let current: string[] | null = null
    for (let j = 0; j < tokens.length; j++) {
        const t = tokens[j]!
        if (t.type === 'thead_open') inHead = true
        else if (t.type === 'thead_close') inHead = false
        else if (t.type === 'tr_open') current = []
        else if (t.type === 'tr_close') {
            rows.push({ cells: current!, header: inHead })
            current = null
        } else if (t.type === 'inline' && current) current.push(renderInline(t.children ?? [], warnings))
    }

    const header = rows.find(r => r.header)
    const body = rows.filter(r => !r.header)
    const cols = Math.max(...rows.map(r => r.cells.length))

    // Длинный текст (без формул) или переносы строк в колонке → колонка X с переносом.
    const plainLength = (c: string) => c.replace(/\$[^$]*\$/g, 'xxxx').replace(/\\[a-zA-Z]+/g, '').length
    const wide = Array.from({ length: cols }, (_, k) =>
        body.some(r => (r.cells[k] ?? '').includes('\\newline') || plainLength(r.cells[k] ?? '') > 45))
    const anyWide = wide.some(Boolean)

    // Пустая шапка и короткие ячейки — «раскладка» без рамок (в исходнике была tabular{llll});
    // пустая шапка и длинный текст — обычная таблица в рамке, просто без заголовков.
    const emptyHeader = !header || header.cells.every(c => !c.trim())
    const layoutOnly = emptyHeader && !anyWide

    const rowLatex = (cells: string[], bold = false) =>
        Array.from({ length: cols }, (_, k) => {
            const c = cells[k] ?? ''
            if (bold && c) return `\\textbf{${c}}`
            return wide[k] ? bulletCell(c) : c
        }).join(' & ') + ' \\\\'
    const align = layoutOnly ? 'l' : 'c'
    const spec = wide.map(w => (w ? '>{\\raggedright\\arraybackslash}X' : align)).join(layoutOnly ? '' : '|')
    const fullSpec = layoutOnly ? spec : `|${spec}|`
    const [begin, end] = anyWide
        ? [`\\begin{tabularx}{\\linewidth}{${fullSpec}}`, '\\end{tabularx}']
        : [`\\begin{tabular}{${fullSpec}}`, '\\end{tabular}']

    const lines: string[] = []
    if (!layoutOnly) lines.push('\\hline')
    if (!emptyHeader && header) lines.push(rowLatex(header.cells, true), '\\hline')
    for (const r of body) {
        lines.push(rowLatex(r.cells))
        // Для таблиц с переносами текста — линия после каждой строки, иначе только в конце.
        if (!layoutOnly && anyWide) lines.push('\\hline')
    }
    if (!layoutOnly && !anyWide) lines.push('\\hline')

    return `\\begin{mdtable}\n${begin}\n${lines.join('\n')}\n${end}\n\\end{mdtable}`
}

/** Ячейка вида «• пункт\newline • пункт» → настоящий список (маркеры в цвет шаблона). */
function bulletCell(cell: string) {
    const lines = cell.split(/\s*\\newline\s*/).map(l => l.trim()).filter(Boolean)
    const bullet = /^•(~|\s)\s*/
    if (lines.length < 1 || !lines.every(l => bullet.test(l))) return cell
    const items = lines.map(l => `\\item ${l.replace(bullet, '')}`).join('\n')
    return `\\begin{itemize}[nosep,leftmargin=*]\n${items}\n\\end{itemize}`
}
