<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { POINTS_PER_RIYAL, STATUS_META, TXN_META, WITHDRAW_FEE_PCT, useWalletStore } from '@/stores/WalletStore'
import type { TxnType } from '@/stores/WalletStore'
import { useGamificationStore } from '@/stores/GamificationStore'

const wallet = useWalletStore()
const gamification = useGamificationStore()
const snackbar = ref('')

// ===== شاشة الشحن =====
const depositDialog = ref(false)
const depositAmount = ref<number | null>(null)
const depositMethodId = ref<number | null>(null)
const QUICK_AMOUNTS = [100, 250, 500, 1000]
function openDeposit() {
  depositAmount.value = null
  depositMethodId.value = wallet.defaultMethod?.id ?? null
  depositDialog.value = true
}
function doDeposit() {
  if (wallet.deposit(Number(depositAmount.value), depositMethodId.value ?? undefined)) {
    snackbar.value = `تم شحن ${depositAmount.value} ر.س بنجاح`
    depositDialog.value = false
  }
}

// ===== شاشة السحب =====
const withdrawDialog = ref(false)
const withdrawAmount = ref<number | null>(null)
const withdrawMethodId = ref<number | null>(null)
const withdrawFee = computed(() => Math.ceil((Number(withdrawAmount.value || 0) * WITHDRAW_FEE_PCT) / 100))
const withdrawValid = computed(() => {
  const n = Number(withdrawAmount.value)
  return n > 0 && n + withdrawFee.value <= wallet.available && withdrawMethodId.value !== null
})
function openWithdraw() {
  withdrawAmount.value = null
  withdrawMethodId.value = wallet.defaultMethod?.id ?? null
  withdrawDialog.value = true
}
function doWithdraw() {
  if (wallet.withdraw(Number(withdrawAmount.value), withdrawMethodId.value ?? undefined)) {
    snackbar.value = 'أُرسل طلب السحب — ستصلك تسوية البنك كإشعار'
    withdrawDialog.value = false
  }
}

// ===== تحويل النقاط =====
const convertDialog = ref(false)
const convertPointsAmount = ref<number | null>(null)
const convertible = computed(() => Math.floor(gamification.points / POINTS_PER_RIYAL) * POINTS_PER_RIYAL)
const convertPreview = computed(() => Math.floor(Number(convertPointsAmount.value || 0) / POINTS_PER_RIYAL))
function openConvert() {
  convertPointsAmount.value = convertible.value
  convertDialog.value = true
}
function doConvert() {
  if (wallet.convertPoints(Number(convertPointsAmount.value))) {
    snackbar.value = 'حُوّلت نقاطك إلى رصيد قابل للسحب'
    convertDialog.value = false
  }
}

// ===== وسائل الدفع =====
const methodDialog = ref(false)
const methodTab = ref<'card' | 'bank'>('card')
const newMethod = ref({ label: '', number: '', holder: '' })
function openAddMethod() {
  newMethod.value = { label: '', number: '', holder: '' }
  methodTab.value = 'card'
  methodDialog.value = true
}
const methodValid = computed(() => {
  const digits = newMethod.value.number.replace(/\s/g, '')
  const okNumber = methodTab.value === 'card' ? /^\d{16}$/.test(digits) : /^SA\d{22}$/i.test(digits) || /^\d{10,24}$/.test(digits)
  return !!newMethod.value.label.trim() && !!newMethod.value.holder.trim() && okNumber
})
function saveMethod() {
  if (methodTab.value === 'card')
    wallet.addCard(newMethod.value.label.trim(), newMethod.value.number, newMethod.value.holder.trim())
  else
    wallet.addBank(newMethod.value.label.trim(), newMethod.value.number, newMethod.value.holder.trim())
  methodDialog.value = false
  snackbar.value = 'أُضيفت وسيلة الدفع'
}

// ===== سجل العمليات =====
const filterType = ref<TxnType | 'all'>('all')
const search = ref('')
const filteredTxns = computed(() =>
  wallet.txns.filter(t =>
    (filterType.value === 'all' || t.type === filterType.value)
    && (!search.value.trim() || t.title.includes(search.value.trim())),
  ),
)
function exportCsv() {
  const header = ['التاريخ', 'النوع', 'الوصف', 'المبلغ', 'الحالة', 'الوسيلة']
  const rows = wallet.txns.map(t => [t.at, TXN_META[t.type].label, t.title, t.amount, STATUS_META[t.status].label, t.methodLabel ?? ''])
  const csv = `﻿${[header, ...rows].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')}`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'wallet-statement.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

// ===== التقارير =====
const PIE_COLORS = ['#A3E635', '#34D399', '#38BDF8', '#FBBF24', '#F87171', '#BEF264']
const pieGradient = computed(() => {
  let acc = 0
  const stops = wallet.byType.map((seg, i) => {
    const from = acc
    acc += seg.pct
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${from}% ${acc}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})
const maxMonthly = computed(() => Math.max(1, ...wallet.monthlyFlow.flatMap(m => [m.inflow, m.outflow])))
const maxBalance = computed(() => Math.max(1, ...wallet.balanceSeries.map(p => p.balance)))
const MONTH_NAMES: Record<string, string> = { '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر' }
function monthLabel(m: string) {
  return MONTH_NAMES[m.slice(5)] ?? m
}
</script>

<template>
  <div>
    <PageHeader
      title="محفظتي"
      subtitle="رصيدك وأرباحك ووسائل الدفع وسجل عملياتك في مكان واحد"
      icon="mdi-wallet-outline"
    />

    <!-- الأرصدة -->
    <VRow class="mb-1">
      <VCol cols="12" md="4">
        <VCard class="pa-5 brand-gradient" theme="darkTheme">
          <div class="text-caption text-white opacity-90 mb-1">الرصيد القابل للسحب</div>
          <div class="text-h4 font-weight-bold text-white mb-3">{{ wallet.available.toLocaleString('ar') }} <span class="text-body-1">ر.س</span></div>
          <div class="d-flex ga-2">
            <VBtn color="accent" size="small" prepend-icon="mdi-plus" @click="openDeposit">شحن</VBtn>
            <VBtn color="white" variant="outlined" size="small" prepend-icon="mdi-bank-transfer-out" :disabled="wallet.available <= 0" @click="openWithdraw">سحب</VBtn>
          </div>
        </VCard>
      </VCol>
      <VCol cols="6" md="4">
        <VCard class="pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-timer-sand" color="warning" size="20" />
            <span class="text-caption text-medium-emphasis">الرصيد المعلق (قيد التسوية)</span>
          </div>
          <div class="text-h5 font-weight-bold">{{ wallet.pending.toLocaleString('ar') }} ر.س</div>
          <div v-if="wallet.processingWithdrawals" class="text-caption text-medium-emphasis mt-1">
            + سحوبات قيد المعالجة: {{ wallet.processingWithdrawals.toLocaleString('ar') }} ر.س
          </div>
        </VCard>
      </VCol>
      <VCol cols="6" md="4">
        <VCard class="pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-1">
            <VIcon icon="mdi-star-circle-outline" color="accent" size="20" />
            <span class="text-caption text-medium-emphasis">النقاط المكتسبة</span>
          </div>
          <div class="text-h5 font-weight-bold">{{ gamification.points.toLocaleString('ar') }} نقطة</div>
          <VBtn size="x-small" color="secondary" variant="tonal" class="mt-2" prepend-icon="mdi-swap-horizontal" :disabled="convertible < POINTS_PER_RIYAL" @click="openConvert">
            حوّلها لرصيد ({{ POINTS_PER_RIYAL }} نقاط = 1 ر.س)
          </VBtn>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <!-- العمود الرئيسي: السجل -->
      <VCol cols="12" lg="7">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
            <h3 class="text-subtitle-1 font-weight-bold">سجل العمليات ({{ filteredTxns.length }})</h3>
            <div class="d-flex ga-2">
              <VTextField v-model="search" placeholder="بحث..." density="compact" hide-details prepend-inner-icon="mdi-magnify" style="max-width: 170px" />
              <VBtn variant="tonal" size="small" prepend-icon="mdi-download-outline" @click="exportCsv">CSV</VBtn>
            </div>
          </div>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <VChip size="small" :color="filterType === 'all' ? 'primary' : undefined" :variant="filterType === 'all' ? 'flat' : 'outlined'" label @click="filterType = 'all'">الكل</VChip>
            <VChip
              v-for="(meta, type) in TXN_META"
              :key="type"
              size="small"
              :color="filterType === type ? 'primary' : undefined"
              :variant="filterType === type ? 'flat' : 'outlined'"
              label
              :prepend-icon="meta.icon"
              @click="filterType = type"
            >
              {{ meta.label }}
            </VChip>
          </div>

          <VList v-if="filteredTxns.length" lines="two" class="py-0">
            <template v-for="(t, i) in filteredTxns" :key="t.id">
              <VListItem class="px-1">
                <template #prepend>
                  <VAvatar :color="TXN_META[t.type].color" variant="tonal" size="40">
                    <VIcon :icon="TXN_META[t.type].icon" size="20" />
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold text-body-2">{{ t.title }}</VListItemTitle>
                <VListItemSubtitle class="text-caption">
                  {{ t.at }}<template v-if="t.methodLabel"> · {{ t.methodLabel }}</template>
                </VListItemSubtitle>
                <template #append>
                  <div class="text-end">
                    <div class="font-weight-bold" :class="t.amount > 0 ? 'text-success' : 'text-error'">
                      {{ t.amount > 0 ? '+' : '' }}{{ t.amount.toLocaleString('ar') }} ر.س
                    </div>
                    <VChip size="x-small" :color="STATUS_META[t.status].color" label variant="tonal">{{ STATUS_META[t.status].label }}</VChip>
                  </div>
                </template>
              </VListItem>
              <VDivider v-if="i < filteredTxns.length - 1" />
            </template>
          </VList>
          <EmptyState v-else icon="mdi-receipt-text-outline" title="لا عمليات مطابقة" description="جرّب تغيير الفلتر أو البحث" />
        </VCard>
      </VCol>

      <!-- العمود الجانبي: وسائل الدفع + التقارير -->
      <VCol cols="12" lg="5">
        <!-- وسائل الدفع -->
        <VCard class="pa-5 mb-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <h3 class="text-subtitle-1 font-weight-bold">وسائل الدفع</h3>
            <VBtn size="small" color="secondary" variant="tonal" prepend-icon="mdi-plus" @click="openAddMethod">إضافة</VBtn>
          </div>
          <div v-for="m in wallet.methods" :key="m.id" class="d-flex align-center ga-3 py-2">
            <VAvatar :color="m.kind === 'bank' ? 'info' : 'secondary'" variant="tonal" rounded="lg" size="40">
              <VIcon :icon="m.kind === 'bank' ? 'mdi-bank-outline' : 'mdi-credit-card-outline'" size="20" />
            </VAvatar>
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-bold">
                {{ m.label }}
                <VChip v-if="m.isDefault" size="x-small" color="primary" label class="ms-1">افتراضية</VChip>
              </div>
              <div class="text-caption text-medium-emphasis" dir="ltr">{{ m.masked }}</div>
            </div>
            <VBtn v-if="!m.isDefault" icon="mdi-star-outline" variant="text" size="x-small" @click="wallet.setDefault(m.id)" />
            <VBtn icon="mdi-delete-outline" variant="text" size="x-small" color="error" @click="wallet.removeMethod(m.id)" />
          </div>
          <p v-if="!wallet.methods.length" class="text-caption text-medium-emphasis">أضف حسابًا بنكيًا أو بطاقة لتتمكن من الشحن والسحب.</p>
        </VCard>

        <!-- التقارير الإحصائية -->
        <VCard class="pa-5 mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">التدفق الشهري</h3>
          <p class="text-caption text-medium-emphasis mb-3">الدخل مقابل المصروف · الإجمالي: <span class="text-success font-weight-bold">+{{ wallet.totalIn.toLocaleString('ar') }}</span> / <span class="text-error font-weight-bold">-{{ wallet.totalOut.toLocaleString('ar') }}</span></p>
          <div class="d-flex align-end ga-3" style="height: 110px">
            <div v-for="m in wallet.monthlyFlow" :key="m.month" class="flex-grow-1 d-flex align-end justify-center ga-1" style="height: 100%">
              <VTooltip :text="`دخل ${m.inflow} ر.س`" location="top">
                <template #activator="{ props }">
                  <div v-bind="props" class="bar-lime rounded-t" :style="{ height: `${Math.max(6, (m.inflow / maxMonthly) * 100)}%`, width: '22px' }" />
                </template>
              </VTooltip>
              <VTooltip :text="`مصروف ${m.outflow} ر.س`" location="top">
                <template #activator="{ props }">
                  <div v-bind="props" class="bg-error rounded-t" :style="{ height: `${Math.max(6, (m.outflow / maxMonthly) * 100)}%`, width: '22px', opacity: 0.75 }" />
                </template>
              </VTooltip>
            </div>
          </div>
          <div class="d-flex ga-3 mt-1">
            <div v-for="m in wallet.monthlyFlow" :key="m.month" class="flex-grow-1 text-center text-caption text-medium-emphasis">{{ monthLabel(m.month) }}</div>
          </div>
        </VCard>

        <VCard class="pa-5 mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">توزيع العمليات حسب النوع</h3>
          <div class="d-flex align-center ga-4 flex-wrap">
            <div class="pie" :style="{ background: pieGradient }" />
            <div class="flex-grow-1 d-flex flex-column ga-1">
              <div v-for="(seg, i) in wallet.byType" :key="seg.type" class="d-flex align-center ga-2 text-caption">
                <span class="pie-dot" :style="{ background: PIE_COLORS[i % PIE_COLORS.length] }" />
                <span class="flex-grow-1">{{ TXN_META[seg.type].label }}</span>
                <span class="font-weight-bold">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </VCard>

        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">مسار الرصيد</h3>
          <div class="d-flex align-end ga-1" style="height: 70px">
            <VTooltip v-for="p in wallet.balanceSeries" :key="p.at + p.balance" :text="`${p.at}: ${p.balance} ر.س`" location="top">
              <template #activator="{ props }">
                <div v-bind="props" class="flex-grow-1 d-flex flex-column justify-end" style="height: 100%">
                  <div class="rounded-t balance-bar" :style="{ height: `${Math.max(4, (p.balance / maxBalance) * 100)}%` }" />
                </div>
              </template>
            </VTooltip>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <!-- ===== شاشة الشحن ===== -->
    <VDialog v-model="depositDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>شحن المحفظة</VCardTitle>
        <VCardText>
          <div class="d-flex ga-2 mb-3">
            <VChip v-for="q in QUICK_AMOUNTS" :key="q" label :color="depositAmount === q ? 'primary' : undefined" :variant="depositAmount === q ? 'flat' : 'outlined'" @click="depositAmount = q">
              {{ q }} ر.س
            </VChip>
          </div>
          <VTextField v-model.number="depositAmount" type="number" min="1" label="المبلغ (ر.س)" prepend-inner-icon="mdi-cash-multiple" class="mb-3" />
          <VSelect
            v-model="depositMethodId"
            :items="wallet.methods.map(m => ({ value: m.id, title: `${m.label} ${m.masked.slice(-7)}` }))"
            label="وسيلة الدفع"
            prepend-inner-icon="mdi-credit-card-outline"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="depositDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!depositAmount || depositAmount <= 0 || !depositMethodId" prepend-icon="mdi-check" @click="doDeposit">تأكيد الشحن</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== شاشة السحب ===== -->
    <VDialog v-model="withdrawDialog" max-width="440">
      <VCard class="pa-2">
        <VCardTitle>سحب رصيد</VCardTitle>
        <VCardText>
          <VAlert color="secondary" variant="tonal" density="compact" class="mb-3" border="start">
            المتاح للسحب: <b>{{ wallet.available.toLocaleString('ar') }} ر.س</b> · رسوم السحب {{ WITHDRAW_FEE_PCT }}%
          </VAlert>
          <VTextField v-model.number="withdrawAmount" type="number" min="1" :max="wallet.available" label="المبلغ (ر.س)" prepend-inner-icon="mdi-cash-minus" class="mb-2" />
          <p v-if="withdrawAmount" class="text-caption text-medium-emphasis mb-2">
            الرسوم: {{ withdrawFee }} ر.س · سيصل حسابك: <b>{{ Number(withdrawAmount) }} ر.س</b>
          </p>
          <VSelect
            v-model="withdrawMethodId"
            :items="wallet.methods.map(m => ({ value: m.id, title: `${m.label} ${m.masked.slice(-7)}` }))"
            label="التحويل إلى"
            prepend-inner-icon="mdi-bank-outline"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="withdrawDialog = false">إلغاء</VBtn>
          <VBtn color="primary" variant="flat" :disabled="!withdrawValid" prepend-icon="mdi-bank-transfer-out" @click="doWithdraw">تأكيد السحب</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== تحويل النقاط ===== -->
    <VDialog v-model="convertDialog" max-width="420">
      <VCard class="pa-2">
        <VCardTitle>تحويل النقاط إلى رصيد</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-3">رصيدك {{ gamification.points }} نقطة — كل {{ POINTS_PER_RIYAL }} نقاط = 1 ر.س. القابل للتحويل الآن: <b>{{ convertible }}</b> نقطة.</p>
          <VTextField v-model.number="convertPointsAmount" type="number" :min="POINTS_PER_RIYAL" :max="convertible" label="عدد النقاط" prepend-inner-icon="mdi-star-circle-outline" />
          <VAlert v-if="convertPreview > 0" color="success" variant="tonal" density="compact" border="start">
            ستحصل على <b>{{ convertPreview }} ر.س</b> في رصيدك القابل للسحب
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="convertDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!convertPointsAmount || convertPointsAmount < POINTS_PER_RIYAL || convertPointsAmount > gamification.points" prepend-icon="mdi-swap-horizontal" @click="doConvert">تحويل</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ===== إضافة وسيلة دفع ===== -->
    <VDialog v-model="methodDialog" max-width="460">
      <VCard class="pa-2">
        <VCardTitle>إضافة وسيلة دفع</VCardTitle>
        <VTabs v-model="methodTab" color="primary" density="comfortable" class="px-4">
          <VTab value="card" prepend-icon="mdi-credit-card-outline">بطاقة</VTab>
          <VTab value="bank" prepend-icon="mdi-bank-outline">حساب بنكي</VTab>
        </VTabs>
        <VCardText>
          <VTextField v-model="newMethod.label" :label="methodTab === 'card' ? 'اسم البطاقة (مدى/فيزا...)' : 'اسم البنك'" class="mb-3" />
          <VTextField
            v-model="newMethod.number"
            :label="methodTab === 'card' ? 'رقم البطاقة (16 رقمًا)' : 'رقم الآيبان IBAN'"
            :placeholder="methodTab === 'card' ? '4111 1111 1111 1111' : 'SA0380000000608010167519'"
            dir="ltr"
            class="mb-3"
          />
          <VTextField v-model="newMethod.holder" label="اسم صاحب الحساب" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="methodDialog = false">إلغاء</VBtn>
          <VBtn color="primary" variant="flat" :disabled="!methodValid" prepend-icon="mdi-check" @click="saveMethod">حفظ</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" location="top" timeout="3000" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.pie {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pie-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.balance-bar {
  background: rgba(var(--v-theme-secondary), 0.65);
}
</style>
