<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import EmptyState from '@/components/shared/EmptyState.vue'
import { POINTS_PER_RIYAL, STATUS_META, TXN_META, WITHDRAW_FEE_PCT, useWalletStore } from '@/stores/WalletStore'
import type { TxnType } from '@/stores/WalletStore'
import { useGamificationStore } from '@/stores/GamificationStore'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

// رمز لون Vuetify → نغمة مكوّنات الأساس
type BaseColor = 'brand' | 'emerald' | 'accent' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
function mapColor(c: string): BaseColor {
  return (({ primary: 'brand', secondary: 'emerald' } as Record<string, BaseColor>)[c] ?? c) as BaseColor
}

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
    <div class="mb-1 grid grid-cols-2 gap-4 md:grid-cols-3">
      <div class="brand-gradient rounded-ui-lg col-span-2 p-5 md:col-span-1">
        <div class="mb-1 text-xs text-white opacity-90">الرصيد القابل للسحب</div>
        <div class="mb-3 text-3xl font-bold text-white">{{ wallet.available.toLocaleString('ar') }} <span class="text-base">ر.س</span></div>
        <div class="flex gap-2">
          <BaseButton variant="accent" size="sm" @click="openDeposit"><BaseIcon name="mdi-plus" :size="18" /> شحن</BaseButton>
          <button
            class="rounded-ui inline-flex h-8 items-center gap-1 border border-white/60 px-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
            :disabled="wallet.available <= 0"
            @click="openWithdraw"
          >
            <BaseIcon name="mdi-bank-transfer-out" :size="18" /> سحب
          </button>
        </div>
      </div>
      <BaseCard class="h-full">
        <div class="mb-1 flex items-center gap-2">
          <BaseIcon name="mdi-timer-sand" :size="20" style="color: rgb(var(--v-theme-warning))" />
          <span class="text-xs text-muted">الرصيد المعلق (قيد التسوية)</span>
        </div>
        <div class="text-2xl font-bold">{{ wallet.pending.toLocaleString('ar') }} ر.س</div>
        <div v-if="wallet.processingWithdrawals" class="mt-1 text-xs text-muted">
          + سحوبات قيد المعالجة: {{ wallet.processingWithdrawals.toLocaleString('ar') }} ر.س
        </div>
      </BaseCard>
      <BaseCard class="h-full">
        <div class="mb-1 flex items-center gap-2">
          <BaseIcon name="mdi-star-circle-outline" :size="20" style="color: rgb(var(--v-theme-accent))" />
          <span class="text-xs text-muted">النقاط المكتسبة</span>
        </div>
        <div class="text-2xl font-bold">{{ gamification.points.toLocaleString('ar') }} نقطة</div>
        <BaseButton variant="tonal-emerald" size="sm" class="mt-2" :disabled="convertible < POINTS_PER_RIYAL" @click="openConvert">
          <BaseIcon name="mdi-swap-horizontal" :size="16" /> حوّلها لرصيد ({{ POINTS_PER_RIYAL }} نقاط = 1 ر.س)
        </BaseButton>
      </BaseCard>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- العمود الرئيسي: السجل -->
      <div class="lg:col-span-7">
        <BaseCard>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold">سجل العمليات ({{ filteredTxns.length }})</h3>
            <div class="flex gap-2">
              <BaseInput v-model="search" prefix-icon="mdi-magnify" placeholder="بحث..." class="w-[170px]" />
              <BaseButton variant="tonal-brand" size="sm" @click="exportCsv"><BaseIcon name="mdi-download-outline" :size="18" /> CSV</BaseButton>
            </div>
          </div>
          <div class="mb-3 flex flex-wrap gap-1">
            <button
              class="rounded-ui px-2.5 py-1 text-xs font-medium transition"
              :class="filterType === 'all' ? 'bg-brand text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
              @click="filterType = 'all'"
            >الكل</button>
            <button
              v-for="(meta, type) in TXN_META"
              :key="type"
              class="rounded-ui inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition"
              :class="filterType === type ? 'bg-brand text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
              @click="filterType = type"
            >
              <BaseIcon :name="meta.icon" :size="14" /> {{ meta.label }}
            </button>
          </div>

          <div v-if="filteredTxns.length">
            <div
              v-for="(t, i) in filteredTxns"
              :key="t.id"
              class="flex items-center gap-3 py-2"
              :class="i < filteredTxns.length - 1 ? 'border-b border-ui' : ''"
            >
              <BaseAvatar :color="mapColor(TXN_META[t.type].color)" :size="40" tonal>
                <BaseIcon :name="TXN_META[t.type].icon" :size="20" />
              </BaseAvatar>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-bold">{{ t.title }}</div>
                <div class="text-xs text-muted">
                  {{ t.at }}<template v-if="t.methodLabel"> · {{ t.methodLabel }}</template>
                </div>
              </div>
              <div class="text-end">
                <div class="font-bold" :style="{ color: `rgb(var(--v-theme-${t.amount > 0 ? 'success' : 'error'}))` }">
                  {{ t.amount > 0 ? '+' : '' }}{{ t.amount.toLocaleString('ar') }} ر.س
                </div>
                <BaseChip :color="mapColor(STATUS_META[t.status].color)">{{ STATUS_META[t.status].label }}</BaseChip>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="mdi-receipt-text-outline" title="لا عمليات مطابقة" description="جرّب تغيير الفلتر أو البحث" />
        </BaseCard>
      </div>

      <!-- العمود الجانبي: وسائل الدفع + التقارير -->
      <div class="lg:col-span-5">
        <!-- وسائل الدفع -->
        <BaseCard class="mb-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-bold">وسائل الدفع</h3>
            <BaseButton variant="tonal-emerald" size="sm" @click="openAddMethod"><BaseIcon name="mdi-plus" :size="18" /> إضافة</BaseButton>
          </div>
          <div v-for="m in wallet.methods" :key="m.id" class="flex items-center gap-3 py-2">
            <BaseAvatar :color="m.kind === 'bank' ? 'info' : 'emerald'" :size="40" tonal square>
              <BaseIcon :name="m.kind === 'bank' ? 'mdi-bank-outline' : 'mdi-credit-card-outline'" :size="20" />
            </BaseAvatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1 text-sm font-bold">
                {{ m.label }}
                <BaseChip v-if="m.isDefault" color="brand">افتراضية</BaseChip>
              </div>
              <div class="text-xs text-muted" dir="ltr">{{ m.masked }}</div>
            </div>
            <button v-if="!m.isDefault" class="icon-btn h-8 w-8" aria-label="جعلها افتراضية" @click="wallet.setDefault(m.id)">
              <BaseIcon name="mdi-star-outline" :size="18" />
            </button>
            <button class="icon-btn h-8 w-8" style="color: rgb(var(--v-theme-error))" aria-label="حذف" @click="wallet.removeMethod(m.id)">
              <BaseIcon name="mdi-delete-outline" :size="18" />
            </button>
          </div>
          <p v-if="!wallet.methods.length" class="text-xs text-muted">أضف حسابًا بنكيًا أو بطاقة لتتمكن من الشحن والسحب.</p>
        </BaseCard>

        <!-- التقارير الإحصائية -->
        <BaseCard class="mb-4">
          <h3 class="mb-1 font-bold">التدفق الشهري</h3>
          <p class="mb-3 text-xs text-muted">الدخل مقابل المصروف · الإجمالي: <span class="font-bold" style="color: rgb(var(--v-theme-success))">+{{ wallet.totalIn.toLocaleString('ar') }}</span> / <span class="font-bold" style="color: rgb(var(--v-theme-error))">-{{ wallet.totalOut.toLocaleString('ar') }}</span></p>
          <div class="flex items-end gap-3" style="height: 110px">
            <div v-for="m in wallet.monthlyFlow" :key="m.month" class="flex h-full flex-1 items-end justify-center gap-1">
              <div class="bar-lime rounded-t" :title="`دخل ${m.inflow} ر.س`" :style="{ height: `${Math.max(6, (m.inflow / maxMonthly) * 100)}%`, width: '22px' }" />
              <div class="rounded-t" :title="`مصروف ${m.outflow} ر.س`" :style="{ height: `${Math.max(6, (m.outflow / maxMonthly) * 100)}%`, width: '22px', opacity: 0.75, background: 'rgb(var(--v-theme-error))' }" />
            </div>
          </div>
          <div class="mt-1 flex gap-3">
            <div v-for="m in wallet.monthlyFlow" :key="m.month" class="flex-1 text-center text-xs text-muted">{{ monthLabel(m.month) }}</div>
          </div>
        </BaseCard>

        <BaseCard class="mb-4">
          <h3 class="mb-3 font-bold">توزيع العمليات حسب النوع</h3>
          <div class="flex flex-wrap items-center gap-4">
            <div class="pie" :style="{ background: pieGradient }" />
            <div class="flex flex-1 flex-col gap-1">
              <div v-for="(seg, i) in wallet.byType" :key="seg.type" class="flex items-center gap-2 text-xs">
                <span class="pie-dot" :style="{ background: PIE_COLORS[i % PIE_COLORS.length] }" />
                <span class="flex-1">{{ TXN_META[seg.type].label }}</span>
                <span class="font-bold">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <h3 class="mb-3 font-bold">مسار الرصيد</h3>
          <div class="flex items-end gap-1" style="height: 70px">
            <div
              v-for="p in wallet.balanceSeries"
              :key="p.at + p.balance"
              class="flex h-full flex-1 flex-col justify-end"
              :title="`${p.at}: ${p.balance} ر.س`"
            >
              <div class="balance-bar rounded-t" :style="{ height: `${Math.max(4, (p.balance / maxBalance) * 100)}%` }" />
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- ===== شاشة الشحن ===== -->
    <BaseModal v-model="depositDialog" title="شحن المحفظة" :max-width="440">
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="q in QUICK_AMOUNTS"
          :key="q"
          class="rounded-ui px-2.5 py-1 text-xs font-medium transition"
          :class="depositAmount === q ? 'bg-brand text-on-brand' : 'border-ui text-content hover:bg-surfalt'"
          @click="depositAmount = q"
        >{{ q }} ر.س</button>
      </div>
      <BaseInput v-model.number="depositAmount" type="number" min="1" label="المبلغ (ر.س)" prefix-icon="mdi-cash-multiple" class="mb-3" />
      <BaseSelect
        v-model="depositMethodId"
        :items="wallet.methods.map(m => ({ value: m.id, title: `${m.label} ${m.masked.slice(-7)}` }))"
        placeholder="وسيلة الدفع"
        prefix-icon="mdi-credit-card-outline"
      />
      <template #actions>
        <BaseButton variant="ghost" @click="depositDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!depositAmount || Number(depositAmount) <= 0 || !depositMethodId" @click="doDeposit">
          <BaseIcon name="mdi-check" :size="18" /> تأكيد الشحن
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ===== شاشة السحب ===== -->
    <BaseModal v-model="withdrawDialog" title="سحب رصيد" :max-width="440">
      <div
        class="rounded-ui mb-3 border-s-4 p-3 text-sm"
        style="border-color: rgb(var(--v-theme-secondary)); background: rgba(var(--v-theme-secondary), 0.1)"
      >
        المتاح للسحب: <b>{{ wallet.available.toLocaleString('ar') }} ر.س</b> · رسوم السحب {{ WITHDRAW_FEE_PCT }}%
      </div>
      <BaseInput v-model.number="withdrawAmount" type="number" min="1" :max="wallet.available" label="المبلغ (ر.س)" prefix-icon="mdi-cash-minus" class="mb-2" />
      <p v-if="withdrawAmount" class="mb-2 text-xs text-muted">
        الرسوم: {{ withdrawFee }} ر.س · سيصل حسابك: <b>{{ Number(withdrawAmount) }} ر.س</b>
      </p>
      <BaseSelect
        v-model="withdrawMethodId"
        :items="wallet.methods.map(m => ({ value: m.id, title: `${m.label} ${m.masked.slice(-7)}` }))"
        placeholder="التحويل إلى"
        prefix-icon="mdi-bank-outline"
      />
      <template #actions>
        <BaseButton variant="ghost" @click="withdrawDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" :disabled="!withdrawValid" @click="doWithdraw">
          <BaseIcon name="mdi-bank-transfer-out" :size="18" /> تأكيد السحب
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ===== تحويل النقاط ===== -->
    <BaseModal v-model="convertDialog" title="تحويل النقاط إلى رصيد" :max-width="420">
      <p class="mb-3 text-sm text-muted">رصيدك {{ gamification.points }} نقطة — كل {{ POINTS_PER_RIYAL }} نقاط = 1 ر.س. القابل للتحويل الآن: <b>{{ convertible }}</b> نقطة.</p>
      <BaseInput v-model.number="convertPointsAmount" type="number" :min="POINTS_PER_RIYAL" :max="convertible" label="عدد النقاط" prefix-icon="mdi-star-circle-outline" />
      <div
        v-if="convertPreview > 0"
        class="rounded-ui mt-3 border-s-4 p-3 text-sm"
        style="border-color: rgb(var(--v-theme-success)); background: rgba(var(--v-theme-success), 0.1)"
      >
        ستحصل على <b>{{ convertPreview }} ر.س</b> في رصيدك القابل للسحب
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="convertDialog = false">إلغاء</BaseButton>
        <BaseButton variant="accent" :disabled="!convertPointsAmount || Number(convertPointsAmount) < POINTS_PER_RIYAL || Number(convertPointsAmount) > gamification.points" @click="doConvert">
          <BaseIcon name="mdi-swap-horizontal" :size="18" /> تحويل
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ===== إضافة وسيلة دفع ===== -->
    <BaseModal v-model="methodDialog" title="إضافة وسيلة دفع" :max-width="460">
      <div class="rounded-ui mb-4 inline-flex overflow-hidden border-ui">
        <button
          class="flex items-center gap-1 px-4 py-2 text-sm transition"
          :class="methodTab === 'card' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
          @click="methodTab = 'card'"
        ><BaseIcon name="mdi-credit-card-outline" :size="18" /> بطاقة</button>
        <button
          class="flex items-center gap-1 px-4 py-2 text-sm transition"
          :class="methodTab === 'bank' ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surfalt'"
          @click="methodTab = 'bank'"
        ><BaseIcon name="mdi-bank-outline" :size="18" /> حساب بنكي</button>
      </div>
      <div class="space-y-3">
        <BaseInput v-model="newMethod.label" :label="methodTab === 'card' ? 'اسم البطاقة (مدى/فيزا...)' : 'اسم البنك'" />
        <BaseInput
          v-model="newMethod.number"
          :label="methodTab === 'card' ? 'رقم البطاقة (16 رقمًا)' : 'رقم الآيبان IBAN'"
          :placeholder="methodTab === 'card' ? '4111 1111 1111 1111' : 'SA0380000000608010167519'"
          dir="ltr"
        />
        <BaseInput v-model="newMethod.holder" label="اسم صاحب الحساب" />
      </div>
      <template #actions>
        <BaseButton variant="ghost" @click="methodDialog = false">إلغاء</BaseButton>
        <BaseButton variant="brand" :disabled="!methodValid" @click="saveMethod">
          <BaseIcon name="mdi-check" :size="18" /> حفظ
        </BaseButton>
      </template>
    </BaseModal>

    <BaseSnackbar :model-value="!!snackbar" color="success" :timeout="3000" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </BaseSnackbar>
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
