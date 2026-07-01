<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'

interface PermissionGroup {
  group: string
  permissions: { key: string, label: string }[]
}

const permissionGroups: PermissionGroup[] = [
  {
    group: 'الفرص',
    permissions: [
      { key: 'view_opportunities', label: 'عرض الفرص' },
      { key: 'create_opportunity', label: 'إنشاء فرصة' },
      { key: 'update_opportunity', label: 'تعديل فرصة' },
      { key: 'delete_opportunity', label: 'حذف فرصة' },
    ],
  },
  {
    group: 'المرشحون',
    permissions: [
      { key: 'view_candidates', label: 'عرض المرشحين' },
      { key: 'send_wish', label: 'إرسال رغبة' },
      { key: 'schedule_interview', label: 'جدولة مقابلة' },
    ],
  },
  {
    group: 'الاستبيانات',
    permissions: [
      { key: 'view_surveys', label: 'عرض الاستبيانات' },
      { key: 'create_survey', label: 'إنشاء استبيان' },
      { key: 'analyze_survey', label: 'تحليل النتائج' },
    ],
  },
  {
    group: 'الإدارة',
    permissions: [
      { key: 'manage_users', label: 'إدارة المستخدمين' },
      { key: 'manage_roles', label: 'إدارة الأدوار' },
      { key: 'moderate_content', label: 'مراقبة المحتوى' },
    ],
  },
]

const roles = ['مدير عام', 'مسؤول توظيف', 'مشرف محتوى']
const selectedRole = ref('مدير عام')

// Mock: which permissions are granted per role
const granted = ref<Record<string, Set<string>>>({
  'مدير عام': new Set(['view_opportunities', 'create_opportunity', 'update_opportunity', 'delete_opportunity', 'view_candidates', 'send_wish', 'schedule_interview', 'view_surveys', 'create_survey', 'analyze_survey', 'manage_users', 'manage_roles', 'moderate_content']),
  'مسؤول توظيف': new Set(['view_opportunities', 'create_opportunity', 'view_candidates', 'send_wish', 'schedule_interview']),
  'مشرف محتوى': new Set(['view_surveys', 'analyze_survey', 'moderate_content']),
})

function isGranted(key: string) {
  return granted.value[selectedRole.value]?.has(key)
}
function toggle(key: string) {
  const set = granted.value[selectedRole.value]
  if (set.has(key))
    set.delete(key)
  else set.add(key)
}
</script>

<template>
  <div>
    <PageHeader
      title="الأدوار والصلاحيات"
      subtitle="تحكّم دقيق في صلاحيات كل دور (RBAC)"
      icon="mdi-shield-account-outline"
    />

    <VRow>
      <!-- Roles list -->
      <VCol cols="12" md="3">
        <VCard class="pa-2">
          <VList>
            <VListItem
              v-for="role in roles"
              :key="role"
              :active="selectedRole === role"
              color="primary"
              rounded="lg"
              @click="selectedRole = role"
            >
              <template #prepend>
                <VIcon icon="mdi-shield-account-outline" />
              </template>
              <VListItemTitle>{{ role }}</VListItemTitle>
            </VListItem>
          </VList>
          <VBtn variant="tonal" color="accent" block class="mt-2" prepend-icon="mdi-plus">دور جديد</VBtn>
        </VCard>
      </VCol>

      <!-- Permissions -->
      <VCol cols="12" md="9">
        <VCard class="pa-5">
          <div class="d-flex justify-space-between align-center mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">صلاحيات: {{ selectedRole }}</h3>
            <VBtn color="accent" size="small" prepend-icon="mdi-content-save">حفظ التغييرات</VBtn>
          </div>

          <div v-for="grp in permissionGroups" :key="grp.group" class="mb-4">
            <div class="text-body-2 font-weight-bold text-primary mb-2">{{ grp.group }}</div>
            <VRow dense>
              <VCol v-for="p in grp.permissions" :key="p.key" cols="12" sm="6">
                <VCard variant="outlined" class="pa-2 px-3 d-flex align-center justify-space-between">
                  <span class="text-body-2">{{ p.label }}</span>
                  <VSwitch
                    :model-value="isGranted(p.key)"
                    color="secondary"
                    hide-details
                    density="compact"
                    @update:model-value="toggle(p.key)"
                  />
                </VCard>
              </VCol>
            </VRow>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
