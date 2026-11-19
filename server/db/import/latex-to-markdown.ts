/**
 * Конвертер LaTeX-разметки сборников (all_tasks.tex) в Markdown + KaTeX.
 *
 * Поддерживается только то, что реально встречается в исходниках:
 * абзацы, $…$, \[…\], gather*, align*, multline*, itemize/enumerate,
 * tabular (в т.ч. со списками в ячейках), center, \podzag, \emph, \textbf,
 * типографика (~, ---, \,, {,}). Неизвестные команды попадают в warnings.
 */

const DISPLAY_ENVS = ['gather*', 'align*', 'multline*']
const LIST_ENVS = ['itemize', 'enumerate']
const NBSP = ' '
const NNBSP = ' '

export interface ConvertResult {
    markdown: string
    warnings: string[]
}

export function latexToMarkdown(tex: string): ConvertResult {
    const warnings: string[] = []
    const markdown = convertBlocks(cleanup(tex), warnings).trim()
    return { markdown, warnings }
}

export function latexInlineToMarkdown(tex: string): ConvertResult {
    const warnings: string[] = []
    const markdown = convertInline(cleanup(tex), warnings)
    return { markdown, warnings }
}

/** Убирает комментарии и чисто оформительские команды. */
function cleanup(tex: string) {
    return tex
        .split('\n')
        .map(line => line.replace(/(?<!\\)%.*$/, ''))
        .join('\n')
        .replace(/\\renewcommand\{\\arraystretch\}\{[^}]*\}/g, '')
}

/** Индекс закрывающей скобки для открывающей в позиции `open`. */
export function matchBrace(s: string, open: number, o = '{', c = '}') {
    let depth = 0
    for (let i = open; i < s.length; i++) {
        if (s[i] === '\\') {
            i++
            continue
        }
        if (s[i] === o) depth++
        else if (s[i] === c && --depth === 0) return i
    }
    throw new Error(`Нет парной скобки: ${s.slice(open, open + 60)}`)
}

/** Позиция конца окружения \end{env} с учётом вложенности; возвращает [начало \end, конец \end]. */
function matchEnv(s: string, from: number, env: string): [number, number] {
    const begin = `\\begin{${env}}`
    const end = `\\end{${env}}`
    let depth = 1
    let i = from
    while (i < s.length) {
        const nb = s.indexOf(begin, i)
        const ne = s.indexOf(end, i)
        if (ne < 0) break
        if (nb >= 0 && nb < ne) {
            depth++
            i = nb + begin.length
        } else {
            if (--depth === 0) return [ne, ne + end.length]
            i = ne + end.length
        }
    }
    throw new Error(`Нет \\end{${env}}`)
}

const STRUCT_RE = /\\\[|\\begin\{([a-z*]+)\}|\\podzag\{/g

function convertBlocks(tex: string, warnings: string[]): string {
    const blocks: string[] = []
    let pos = 0

    const flushText = (text: string) => {
        for (const para of text.split(/\n\s*\n/)) {
            const md = convertInline(para, warnings)
            if (md) blocks.push(escapeLineStart(md))
        }
    }

    STRUCT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = STRUCT_RE.exec(tex))) {
        const start = m.index
        let end: number

        if (m[0] === '\\[') {
            const close = tex.indexOf('\\]', start + 2)
            if (close < 0) throw new Error('Нет \\]')
            flushText(tex.slice(pos, start))
            blocks.push(displayMath(tex.slice(start + 2, close)))
            end = close + 2
        } else if (m[0] === '\\podzag{') {
            const close = matchBrace(tex, start + '\\podzag'.length)
            flushText(tex.slice(pos, start))
            blocks.push(`### ${convertInline(tex.slice(start + '\\podzag{'.length, close), warnings)}`)
            end = close + 1
        } else {
            const env = m[1]!
            const bodyStart = start + m[0].length
            const [endStart, endEnd] = matchEnv(tex, bodyStart, env)
            const body = tex.slice(bodyStart, endStart)
            flushText(tex.slice(pos, start))
            end = endEnd

            if (DISPLAY_ENVS.includes(env)) {
                // KaTeX не знает multline* — переводим в gather*.
                const target = env === 'multline*' ? 'gather*' : env
                blocks.push(displayMath(`\\begin{${target}}\n${body.trim()}\n\\end{${target}}`))
            } else if (LIST_ENVS.includes(env)) {
                blocks.push(convertList(env, body, warnings))
            } else if (env === 'tabular') {
                blocks.push(convertTabular(body, warnings))
            } else if (env === 'tikzpicture') {
                // Рисунок сохраняем кодом; SVG для сайта отрисовывает импорт (server/db/import/tikz-figures.ts).
                blocks.push('```tikz\n' + `\\begin{tikzpicture}${body.replace(/\s+$/, '')}\n\\end{tikzpicture}` + '\n```')
            } else if (env === 'center') {
                const inner = convertBlocks(body, warnings)
                if (inner) blocks.push(inner)
            } else {
                warnings.push(`Неизвестное окружение ${env}`)
                flushText(body)
            }
        }

        pos = end
        STRUCT_RE.lastIndex = end
    }
    flushText(tex.slice(pos))
    return blocks.join('\n\n')
}

function displayMath(content: string) {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    return `$$\n${lines.join('\n')}\n$$`
}

/** Необязательные параметры окружения вида [nosep,leftmargin=*]. */
function skipOptions(body: string) {
    const t = body.replace(/^\s*/, '')
    return t.startsWith('[') ? t.slice(matchBrace(t, 0, '[', ']') + 1) : body
}

function splitItems(body: string) {
    const items: string[] = []
    let depth = 0
    let current: string | null = null
    const re = /\\begin\{[a-z*]+\}|\\end\{[a-z*]+\}|\\item\b/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(body))) {
        if (m[0].startsWith('\\begin')) depth++
        else if (m[0].startsWith('\\end')) depth--
        else if (depth === 0) {
            if (current !== null) items.push(current + body.slice(last, m.index))
            current = ''
            last = m.index + m[0].length
        }
    }
    if (current !== null) items.push(current + body.slice(last))
    return items
}

function convertList(env: string, body: string, warnings: string[]) {
    const items = splitItems(skipOptions(body))
    return items.map((item, i) => {
        const marker = env === 'enumerate' ? `${i + 1}. ` : '- '
        const indent = ' '.repeat(marker.length)
        const md = convertBlocks(item, warnings)
        return md
            .split('\n')
            .map((line, j) => (j === 0 ? marker + line : line ? indent + line : line))
            .join('\n')
    }).join('\n')
}

/** Делит строку по разделителю на верхнем уровне (вне {}, $…$ и вложенных окружений). */
function splitTop(s: string, sep: string) {
    const parts: string[] = []
    let depth = 0
    let envDepth = 0
    let inMath = false
    let last = 0
    for (let i = 0; i < s.length; i++) {
        if (s.startsWith('\\begin{', i)) envDepth++
        else if (s.startsWith('\\end{', i)) envDepth--
        const ch = s[i]
        if (ch === '\\' && s.slice(i, i + sep.length) !== sep) {
            i++
            continue
        }
        if (ch === '$') inMath = !inMath
        else if (ch === '{') depth++
        else if (ch === '}') depth--
        if (!depth && !envDepth && !inMath && s.startsWith(sep, i)) {
            parts.push(s.slice(last, i))
            i += sep.length - 1
            last = i + 1
        }
    }
    parts.push(s.slice(last))
    return parts
}

function convertTabular(body: string, warnings: string[]) {
    // Спецификация колонок: {|c|c|} или {|>{\bfseries}c|p{0.72\linewidth}|}
    const t = body.replace(/^\s*/, '')
    const specEnd = matchBrace(t, 0)
    const spec = t.slice(1, specEnd)
    const boldCols = parseBoldColumns(spec)

    const rows = splitTop(t.slice(specEnd + 1).replace(/\\hline/g, ''), '\\\\')
        .map(r => r.trim())
        .filter(Boolean)
        .map(r => splitTop(r, '&').map(c => c.trim()))

    const cols = Math.max(...rows.map(r => r.length))
    // Шапка — первая строка, где все непустые клетки жирные (угловая клетка может быть пустой).
    const isHeader = rows.length > 1
        && rows[0]!.some(c => c !== '')
        && rows[0]!.every(c => c === '' || /^\\textbf\{/.test(c))

    const cell = (raw: string, col: number) => {
        let md: string
        if (/\\begin\{(itemize|enumerate)\}/.test(raw)) {
            const m = raw.match(/\\begin\{(itemize|enumerate)\}([\s\S]*)\\end\{\1\}/)!
            const items = splitItems(skipOptions(m[2]!)).map(it => convertInline(it, warnings))
            md = items.map(it => `•${NBSP}${it}`).join('<br>')
        } else {
            md = convertInline(raw, warnings)
        }
        if (boldCols.has(col) && md) md = `**${md}**`
        return md.replace(/\|/g, '\\|')
    }

    const line = (cells: string[]) => `| ${cells.join(' | ')} |`
    const out: string[] = []
    const header = isHeader ? rows.shift()! : Array<string>(cols).fill('')
    out.push(line(header.map((c, i) => cell(c, i))))
    out.push(line(Array<string>(cols).fill('---')))
    for (const r of rows) {
        while (r.length < cols) r.push('')
        out.push(line(r.map((c, i) => cell(c, i))))
    }
    return out.join('\n')
}

function parseBoldColumns(spec: string) {
    const bold = new Set<number>()
    let col = 0
    let pendingBold = false
    for (let i = 0; i < spec.length; i++) {
        const ch = spec[i]!
        if (ch === '>') {
            const close = matchBrace(spec, i + 1)
            pendingBold = spec.slice(i + 2, close).includes('\\bfseries')
            i = close
        } else if ('lcrp'.includes(ch)) {
            if (pendingBold) bold.add(col)
            pendingBold = false
            col++
            if (ch === 'p') i = matchBrace(spec, i + 1)
        }
    }
    return bold
}

function escapeLineStart(md: string) {
    return md
        .replace(/^(\d+)([.)])(\s)/, '$1\\$2$3')
        .replace(/^([-+#>])/, '\\$1')
}

const PH_OPEN = ''
const PH_CLOSE = ''

/** Строчный текст: формулы $…$ сохраняются как есть, остальное — типографика и Markdown. */
function convertInline(tex: string, warnings: string[]): string {
    const math: string[] = []
    // Защищаем формулы от текстовых замен.
    let text = tex.replace(/(?<!\\)\$([^$]+)\$/g, (_, inner: string) => {
        math.push(`$${inner.replace(/\s+/g, ' ').trim()}$`)
        return `${PH_OPEN}${math.length - 1}${PH_CLOSE}`
    })

    text = formatCommands(text.replace(/[*_]/g, '\\$&'))
        .replace(/~---/g, `${NBSP}—`)
        .replace(/---/g, '—')
        .replace(/--/g, '–')
        .replace(/~/g, NBSP)
        .replace(/\\,/g, NNBSP)
        .replace(/\\ /g, ' ')
        .replace(/\\%/g, '%')
        .replace(/\\ldots\b\s?/g, '…')
        .replace(/\{,\}/g, ',')
        .replace(/\s+/g, ' ')
        .trim()

    for (const m of text.matchAll(/\\[a-zA-Z]+|\\./g)) {
        if (m[0] !== '\\*' && m[0] !== '\\_') warnings.push(`Неизвестная команда ${m[0]} в «${text.slice(0, 60)}»`)
    }

    return text.replace(new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, 'g'), (_, i: string) => math[Number(i)]!)
}

function formatCommands(text: string): string {
    // \texorpdfstring{для текста}{для закладок PDF} — на сайте нужен первый вариант.
    let i: number
    while ((i = text.indexOf('\\texorpdfstring{')) >= 0) {
        const firstClose = matchBrace(text, i + '\\texorpdfstring'.length)
        const secondClose = matchBrace(text, firstClose + 1)
        text = text.slice(0, i) + text.slice(i + '\\texorpdfstring{'.length, firstClose) + text.slice(secondClose + 1)
    }
    text = replaceCommand(text, 'emph', arg => `*${formatCommands(arg)}*`)
    return replaceCommand(text, 'textbf', arg => `**${formatCommands(arg)}**`)
}

function replaceCommand(text: string, name: string, fn: (arg: string) => string) {
    const token = `\\${name}{`
    let i: number
    while ((i = text.indexOf(token)) >= 0) {
        const close = matchBrace(text, i + token.length - 1)
        text = text.slice(0, i) + fn(text.slice(i + token.length, close)) + text.slice(close + 1)
    }
    return text
}
