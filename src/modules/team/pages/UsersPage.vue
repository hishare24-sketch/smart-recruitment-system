<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'suspended'
  joined: string
}

const search = ref('')
const users = ref<AdminUser[]>([
  { id: 1, name: 'أحمد المنصور', email: 'ahmed@example.com', role: 'باحث', status: 'active', joined: '2026-01-14' },
  { id: 2, name: 'شركة تقنية المستقبل', email: 'hr@future.com', role: 'جهة توظيف', status: 'active', joined: '2026-02-03' },
  { id: 3, name: 'محمد العلي', email: 'mohammed@example.com', role: 'موصٍ', status: 'active', joined: '2026-03-19' },
  { id: 4, name: 'نورة القحطاني', email: 'noura@example.com', role: 'باحث', status: 'suspended', joined: '2026-04-22' },
  { id: 5, name: 'سارة الإدارية', email: 'sara@platform.com', role: 'مدير', status: 'active', joined: '2025-12-01' },
])

const filtered = computed(() => users.value.filter(u =>
  !search.value || u.name.includes(search.value) || u.email.includes(search.value),
))

function toggleStatus(user: AdminUser) {
  user.status = user.status === 'active' ? 'suspended' : 'active'
}
</script>

<template>
  <div>
    <PageHeader
      title="إدارة المستخدمين"
      subtitle="عرض وإدارة جميع مستخدمي المنصة"
      icon="mdi-account-multiple-outline"
    >
      <template #actions>
        <VBtn color="accent" prepend-icon="mdi-account-plus">إضافة مستخدم</VBtn>
      </template>
    </PageHeader>

    <VCard class="pa-4 mb-4">
      <VTextField
        v-model="search"
        placeholder="ابحث بالاسم أو البريد..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        style="max-width: 420px"
      />
    </VCard>

    <VCard>
      <VTable>
        <thead>
          <tr>
            <th class="text-start">المستخدم</th>
            <th class="text-start">البريد</th>
            <th class="text-start">الدور</th>
            <th class="text-start">الحالة</th>
            <th class="text-start">تاريخ الانضمام</th>
            <th class="text-start">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
            <td>
              <div class="d-flex align-center ga-2 py-2">
                <VAvatar color="secondary" size="36"><span class="text-white">{{ u.name.charAt(0) }}</span></VAvatar>
                <span class="font-weight-bold">{{ u.name }}</span>
              </div>
            </td>
            <td class="text-medium-emphasis">{{ u.email }}</td>
            <td><VChip size="small" variant="tonal" color="primary">{{ u.role }}</VChip></td>
            <td>
              <VChip :color="u.status === 'active' ? 'success' : 'error'" size="small" label>
                {{ u.status === 'active' ? 'نشط' : 'موقوف' }}
              </VChip>
            </td>
            <td class="text-medium-emphasis">{{ u.joined }}</td>
            <td>
              <VBtn icon="mdi-pencil" variant="text" size="small" />
              <VBtn
                :icon="u.status === 'active' ? 'mdi-account-cancel-outline' : 'mdi-account-check-outline'"
                variant="text"
                size="small"
                :color="u.status === 'active' ? 'error' : 'success'"
                @click="toggleStatus(u)"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>
  </div>
</template>
