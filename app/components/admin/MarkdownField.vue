<script setup lang="ts">
// Поле Markdown + LaTeX с предпросмотром. Рендерит сервер (тот же код, что на сайте).
const props = withDefaults(defineProps<{
  label?: string
  rows?: number
  /** Однострочное поле (ответ) — без абзацев. */
  inline?: boolean
  placeholder?: string
}>(), { label: undefined, rows: 10, inline: false, placeholder: undefined })

const model = defineModel<string>({ required: true })

const html = ref('')
const failed = ref(false)
let requestId = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function render(text: string) {
  const id = ++requestId
  try {
    const res = await $fetch<{ html: string }>('/api/admin/preview', {
      method: 'POST',
      body: { markdown: text, inline: props.inline },
    })
    if (id === requestId) {
      html.value = res.html
      failed.value = false
    }
  } catch {
    if (id === requestId) failed.value = true
  }
}

watch(model, (text) => {
  clearTimeout(timer)
  timer = setTimeout(() => render(text), 300)
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(timer))

const hasKatexError = computed(() => html.value.includes('katex-error'))
</script>

<template>
  <div>
    <div v-if="label || $slots.actions" class="mb-1.5 flex items-center gap-2">
      <span v-if="label" class="text-sm font-medium text-highlighted">{{ label }}</span>
      <div class="ml-auto flex items-center gap-1">
        <slot name="actions"/>
      </div>
    </div>

    <div v-if="inline" class="grid gap-2 sm:grid-cols-2">
      <UInput v-model="model" :placeholder="placeholder" class="w-full font-mono"/>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="math-content flex items-center rounded-md bg-muted px-3 py-1.5 text-sm min-h-8" v-html="html"/>
    </div>

    <div v-else class="grid gap-2 lg:grid-cols-2">
      <UTextarea
          v-model="model"
          :rows="rows"
          :placeholder="placeholder"
          autoresize
          :maxrows="40"
          class="w-full"
          :ui="{ base: 'font-mono text-sm leading-relaxed' }"
      />
      <div class="rounded-md border border-default bg-default p-3 text-sm overflow-hidden">
        <div class="mb-2 flex items-center gap-1.5 text-xs text-dimmed">
          <UIcon name="i-lucide-eye" class="size-3.5"/>
          Предпросмотр
          <span v-if="hasKatexError" class="ml-auto text-error">ошибка в формуле</span>
          <span v-else-if="failed" class="ml-auto text-error">не удалось обновить</span>
        </div>
        <MathContent :html="html"/>
      </div>
    </div>
  </div>
</template>
