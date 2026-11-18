<script setup lang="ts">
// Создание (item = null) или правка темы.
const props = defineProps<{ item?: AdminTopic | null }>()
const emit = defineEmits<{ saved: [topic: AdminTopic] }>()
const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const form = reactive<AdminTopicInput>({ name: '', slug: '' })
const slugTouched = ref(false)
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  form.name = props.item?.name ?? ''
  form.slug = props.item?.slug ?? ''
  slugTouched.value = Boolean(props.item)
  error.value = ''
})

// Пока адрес не трогали руками — предлагаем транслитерацию названия.
watch(() => form.name, (name) => {
  if (!slugTouched.value) form.slug = slugify(name)
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    const topic = await $fetch<AdminTopic>(props.item ? `/api/admin/topics/${props.item.id}` : '/api/admin/topics', {
      method: props.item ? 'PUT' : 'POST',
      body: form,
    })
    toast.add({ title: props.item ? 'Тема сохранена' : 'Тема создана', color: 'success', icon: 'i-lucide-check' })
    emit('saved', topic)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось сохранить')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="item ? 'Тема' : 'Новая тема'">
    <template #body>
      <form id="topic-form" class="space-y-3" @submit.prevent="save">
        <UFormField label="Название">
          <UInput v-model="form.name" placeholder="Например: Теория вероятностей" autofocus class="w-full"/>
        </UFormField>
        <UFormField label="Адрес (slug)" hint="латиница, для ссылок">
          <UInput v-model="form.slug" class="w-full" @input="slugTouched = true"/>
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Отмена</UButton>
        <UButton type="submit" form="topic-form" :loading="saving">{{ item ? 'Сохранить' : 'Создать' }}</UButton>
      </div>
    </template>
  </UModal>
</template>
