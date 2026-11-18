import { z } from 'zod'

const bodySchema = z.object({
    markdown: z.string().max(200_000),
    inline: z.boolean().optional(),
})

/** Предпросмотр для редактора: тот же рендер, что и на сайте. */
export default defineAdminHandler(async (event) => {
    const { markdown, inline } = await readValidatedBody(event, validator(bodySchema))
    return { html: renderMarkdownPreview(markdown, inline) }
})
