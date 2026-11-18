<script setup lang="ts">
// Создание (item = null) или правка номера ЕГЭ.
const props = defineProps<{ item?: AdminTaskType | null }>()
const emit = defineEmits<{ saved: [taskType: AdminTaskType] }>()
const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const form = reactive<AdminTaskTypeInput>({ number: 1, examLevel: 'profile', name: '' })
const saving = ref(false)
const error = ref('')

const levelItems = [
  { label: 'Профильный', value: 'profile' },
  { label: 'Базовый', value: 'base' },
]

watch(open, (isOpen) => {
  if (!isOpen) return
  form.number = props.item?.number ?? 1
  form.examLevel = props.item?.examLevel ?? 'profile'
  form.name = props.item?.name ?? ''
  error.value = ''
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    const taskType = await $fetch<AdminTaskType>(props.item ? `/api/admin/task-types/${props.item.id}` : '/api/admin/task-types', {
      method: props.item ? 'PUT' : 'POST',
      body: form,
    })
    toast.add({ title: props.item ? 'Номер сохранён' : 'Номер создан', color: 'success', icon: 'i-lucide-check' })
    emit('saved', taskType)
    open.value = false
  } catch (e) {
    error.value = errorMessage(e, 'Не удалось сохранить')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="item ? `Номер ЕГЭ №${item.number}` : 'Новый номер ЕГЭ'">
    <template #body>
      <form id="task-type-form" class="space-y-3" @submit.prevent="save">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Номер задания">
            <UInput v-model.number="form.number" type="number" min="1" max="99" class="w-full"/>
          </UFormField>
          <UFormField label="Уровень">
            <USelect v-model="form.examLevel" :items="levelItems" class="w-full"/>
          </UFormField>
        </div>
        <UFormField label="Название">
          <UInput v-model="form.name" placeholder="Например: Экономическая задача" class="w-full"/>
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-circle-alert"/>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Отмена</UButton>
        <UButton type="submit" form="task-type-form" :loading="saving">{{ item ? 'Сохранить' : 'Создать' }}</UButton>
      </div>
    </template>
  </UModal>
</template>
