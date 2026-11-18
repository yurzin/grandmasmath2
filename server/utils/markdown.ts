import MarkdownIt from 'markdown-it'
import { katex } from '@mdit/plugin-katex'

// Контент пишет только автор/админ, поэтому HTML внутри Markdown разрешён.
const md = new MarkdownIt({ html: true, linkify: false, typographer: false })
    .use(katex, {
        delimiters: 'dollars',
        strict: 'ignore',
        throwOnError: false,
    })

const CACHE_LIMIT = 500
const cache = new Map<string, string>()

function cached(key: string, render: () => string) {
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const html = render()
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
    cache.set(key, html)
    return html
}

/** Markdown + LaTeX ($…$, $$…$$) → HTML. */
export function renderMarkdown(source: string) {
    return cached(`b:${source}`, () => md.render(source))
}

/** Однострочный Markdown без обёртки <p> — для ответов и заголовков. */
export function renderMarkdownInline(source: string) {
    return cached(`i:${source}`, () => md.renderInline(source))
}

/** Рендер без кэша — для предпросмотра в админке (каждая правка уникальна). */
export function renderMarkdownPreview(source: string, inline = false) {
    return inline ? md.renderInline(source) : md.render(source)
}

/** Первый абзац текста — превью для карточек. */
export function markdownExcerpt(source: string) {
    const first = source.trim().split(/\n\s*\n/)[0] ?? ''
    return renderMarkdown(first)
}
