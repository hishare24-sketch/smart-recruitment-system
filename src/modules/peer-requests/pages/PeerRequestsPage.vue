<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { ai } from '@/services/ai'
import { ALL_SKILLS } from '@/services/taxonomy'
import {
  PEER_DIRECTORY,
  PEER_STATUS_META,
  PEER_TYPE_META,
  usePeerRequestsStore,
} from '@/stores/PeerRequestsStore'
import type { PeerRequestType } from '@/stores/PeerRequestsStore'

const store = usePeerRequestsStore()
const tab = ref<'incoming' | 'outgoing'>('incoming')

const types = Object.keys(PEER_TYPE_META) as PeerRequestType[]

// — New request dialog —
const dialog = ref(false)
const form = ref<{ person: string, type: PeerRequestType, reason: string, skills: string[], attachments: string[] }>({
  person: '',
  type: 'recommendation',
  reason: '',
  skills: [],
  attachments: [],
})
const aiTip = computed(() => ai.peerRequestTip(form.value.type))
const canSend = computed(() => !!form.value.person && form.value.reason.trim().length > 3)
const snackbar = ref('')

function openNew(type?: PeerRequestType) {
  form.value = { person: '', type: type ?? 'recommendation', reason: '', skills: [], attachments: [] }
  dialog.value = true
}
function addMockAttachment() {
  form.value.attachments.push(`مستند_داعم_${form.value.attachments.length + 1}.pdf`)
}
function send() {
  const person = PEER_DIRECTORY.find(p => p.name === form.value.person)
  store.create({
    type: form.value.type,
    personName: form.value.person,
    personRole: person?.role ?? 'مستخدم',
    reason: form.value.reason.trim(),
    skills: form.value.skills,
    attachments: form.value.attachments,
  })
  dialog.value = false
  tab.value = 'outgoing'
  snackbar.value = 'تم إرسال الطلب — ستُشعر عند الرد عليه.'
}
</script>

<template>
  <div>
    <PageHeader
      title="الطلبات المتبادلة"
      subtitle="اطلب توصية أو تزكية أو تقييمًا أو استشارة من أي مستخدم — وأدر ما يردك في مكان واحد"
      icon="mdi-swap-horizontal-circle-outline"
    >
      <template #actions>
        <VBtn color="accent" prepend-icon="mdi-plus" @click="openNew()">طلب جديد</VBtn>
      </template>
    </PageHeader>

    <!-- Quick-start type chips -->
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <span class="text-caption text-medium-emphasis">أنشئ بسرعة:</span>
      <VChip
        v-for="t in types"
        :key="t"
        size="small"
        variant="outlined"
        :prepend-icon="PEER_TYPE_META[t].icon"
        @click="openNew(t)"
      >
        {{ PEER_TYPE_META[t].label }}
      </VChip>
    </div>

    <VTabs v-model="tab" color="primary" class="mb-4">
      <VTab value="incoming">
        الطلبات الواردة
        <VChip v-if="store.incoming.length" size="x-small" class="ms-1" label>{{ store.incoming.length }}</VChip>
      </VTab>
      <VTab value="outgoing">
        الطلبات الصادرة
        <VChip v-if="store.outgoing.length" size="x-small" class="ms-1" label>{{ store.outgoing.length }}</VChip>
      </VTab>
    </VTabs>

    <VWindow v-model="tab">
      <!-- Incoming -->
      <VWindowItem value="incoming">
        <VRow v-if="store.incoming.length" dense>
          <VCol v-for="r in store.incoming" :key="r.id" cols="12" md="6">
            <VCard variant="outlined" class="pa-4 h-100">
              <div class="d-flex align-center ga-2 mb-2">
                <VAvatar :color="PEER_TYPE_META[r.type].color" variant="tonal" rounded="lg">
                  <VIcon :icon="PEER_TYPE_META[r.type].icon" />
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ PEER_TYPE_META[r.type].label }} من {{ r.personName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ r.personRole }} · {{ r.date }}</div>
                </div>
                <VChip :color="PEER_STATUS_META[r.status].color" size="small" label>{{ PEER_STATUS_META[r.status].label }}</VChip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-2">{{ r.reason }}</p>
              <div v-if="r.skills.length" class="d-flex flex-wrap ga-1 mb-3">
                <VChip v-for="s in r.skills" :key="s" size="x-small" variant="tonal">{{ s }}</VChip>
              </div>
              <div class="d-flex ga-2">
                <template v-if="r.status === 'pending'">
                  <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check" @click="store.accept(r.id)">قبول</VBtn>
                  <VBtn size="small" color="error" variant="text" prepend-icon="mdi-close" @click="store.reject(r.id)">رفض</VBtn>
                </template>
                <template v-else-if="r.status === 'accepted'">
                  <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-play" @click="store.startWork(r.id)">بدء التنفيذ</VBtn>
                </template>
                <template v-else-if="r.status === 'in_progress'">
                  <VBtn size="small" color="success" variant="tonal" prepend-icon="mdi-check-all" @click="store.complete(r.id)">إكمال</VBtn>
                </template>
                <span v-else class="text-caption text-medium-emphasis align-self-center">
                  <VIcon icon="mdi-check-decagram" size="14" color="success" /> تمت المعالجة
                </span>
              </div>
            </VCard>
          </VCol>
        </VRow>
        <VCard v-else>
          <EmptyState icon="mdi-inbox-outline" title="لا طلبات واردة" description="ستظهر هنا الطلبات التي يرسلها إليك الآخرون." />
        </VCard>
      </VWindowItem>

      <!-- Outgoing -->
      <VWindowItem value="outgoing">
        <VRow v-if="store.outgoing.length" dense>
          <VCol v-for="r in store.outgoing" :key="r.id" cols="12" md="6">
            <VCard variant="outlined" class="pa-4 h-100">
              <div class="d-flex align-center ga-2 mb-2">
                <VAvatar :color="PEER_TYPE_META[r.type].color" variant="tonal" rounded="lg">
                  <VIcon :icon="PEER_TYPE_META[r.type].icon" />
                </VAvatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-bold">{{ PEER_TYPE_META[r.type].label }} إلى {{ r.personName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ r.personRole }} · {{ r.date }}</div>
                </div>
                <VChip :color="PEER_STATUS_META[r.status].color" size="small" label>{{ PEER_STATUS_META[r.status].label }}</VChip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-2">{{ r.reason }}</p>
              <div v-if="r.skills.length" class="d-flex flex-wrap ga-1 mb-3">
                <VChip v-for="s in r.skills" :key="s" size="x-small" variant="tonal">{{ s }}</VChip>
              </div>
              <VBtn v-if="r.status === 'pending'" size="small" color="error" variant="text" prepend-icon="mdi-cancel" @click="store.cancelOutgoing(r.id)">إلغاء الطلب</VBtn>
              <span v-else class="text-caption text-medium-emphasis"><VIcon :icon="PEER_STATUS_META[r.status].color === 'success' ? 'mdi-check-decagram' : 'mdi-clock-outline'" size="14" /> {{ PEER_STATUS_META[r.status].label }}</span>
            </VCard>
          </VCol>
        </VRow>
        <VCard v-else>
          <EmptyState icon="mdi-send-outline" title="لا طلبات صادرة" description="أرسل أول طلب عبر زر «طلب جديد»." />
        </VCard>
      </VWindowItem>
    </VWindow>

    <!-- New request dialog -->
    <VDialog v-model="dialog" max-width="560">
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>طلب جديد</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </VCardTitle>
        <VCardText>
          <div class="text-caption font-weight-bold mb-2">نوع الطلب</div>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <VChip
              v-for="t in types"
              :key="t"
              :color="form.type === t ? PEER_TYPE_META[t].color : undefined"
              :variant="form.type === t ? 'flat' : 'outlined'"
              size="small"
              :prepend-icon="PEER_TYPE_META[t].icon"
              @click="form.type = t"
            >
              {{ PEER_TYPE_META[t].label }}
            </VChip>
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            <VIcon :icon="PEER_TYPE_META[form.type].icon" size="14" /> {{ PEER_TYPE_META[form.type].desc }}
          </div>

          <VSelect
            v-model="form.person"
            :items="PEER_DIRECTORY.map(p => ({ value: p.name, title: `${p.name} — ${p.role}` }))"
            label="إلى"
            prepend-inner-icon="mdi-account-outline"
            class="mb-3"
          />
          <VTextarea v-model="form.reason" label="سبب الطلب" rows="2" auto-grow class="mb-3" placeholder="مثال: أرغب في توصية تؤكد مهاراتي في إدارة المشاريع" />
          <VCombobox
            v-model="form.skills"
            :items="ALL_SKILLS"
            label="المهارات المراد تأكيدها (اختياري)"
            multiple chips closable-chips
            class="mb-2"
          />
          <div class="d-flex align-center ga-2 mb-3">
            <VBtn size="small" variant="tonal" prepend-icon="mdi-paperclip" @click="addMockAttachment">إرفاق مستند</VBtn>
            <VChip v-for="a in form.attachments" :key="a" size="x-small" label prepend-icon="mdi-file-outline">{{ a }}</VChip>
          </div>

          <VAlert color="secondary" variant="tonal" density="comfortable" border="start">
            <template #prepend><VIcon icon="mdi-robot-happy-outline" /></template>
            <span class="text-caption">{{ aiTip }}</span>
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="dialog = false">إلغاء</VBtn>
          <VBtn color="accent" prepend-icon="mdi-send" :disabled="!canSend" @click="send">إرسال الطلب</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" location="top" timeout="3500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>
