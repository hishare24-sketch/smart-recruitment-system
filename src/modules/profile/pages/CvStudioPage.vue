<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api, type CvExtractionData } from '@/services/api'
import { useProfileStore } from '@/stores/ProfileStore'
import { useAuthStore } from '@/stores/AuthStore'
import PageHeader from '@/components/shared/PageHeader.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'

const profile = useProfileStore()
const auth = useAuthStore()

const snack = reactive({ show: false, text: '' })
function toast(text: string) { snack.text = text; snack.show = true }

// ——— الطول والصياغة بالذكاء ———
type Length = 'short' | 'medium' | 'expanded'
const length = ref<Length>('medium')
const composing = ref(false)
const draft = reactive<{ headline: string, summary: string, highlights: string[], live: boolean, provider: string }>({
  headline: profile.headline,
  summary: profile.summary,
  highlights: [],
  live: false,
  provider: '',
})

function profilePayload() {
  return {
    headline: profile.headline,
    field: profile.headline,
    skills: profile.skills.map(s => ({ name: s.name, level: s.selfLevel })),
    experiences: profile.experiences.map(e => ({ title: e.title, org: e.company, years: 0, summary: e.desc })),
    certificates: profile.certificates.map(c => ({ name: c.name, issuer: c.issuer, year: c.date })),
  }
}

let composeSeq = 0
async function compose(len: Length) {
  length.value = len
  composing.value = true
  const seq = ++composeSeq
  try {
    const res = await api.assistant.composeCv(len, profilePayload())
    if (seq !== composeSeq)
      return // طلب أحدث سبقه — تجاهل هذه الاستجابة القديمة (منع السباق)
    draft.headline = res.data.headline || profile.headline
    draft.summary = res.data.summary || profile.summary
    draft.highlights = res.data.highlights || []
    draft.live = res.live
    draft.provider = res.meta?.provider ? `${res.meta.provider}` : ''
    toast(res.live ? `صيغت بالذكاء (${res.meta.provider}) — طول: ${lengthLabel(len)}` : `صيغت (محاكاة) — طول: ${lengthLabel(len)}`)
  }
  catch (e) { if (seq === composeSeq) toast((e as { message?: string })?.message ?? 'تعذّرت الصياغة') }
  finally { if (seq === composeSeq) composing.value = false }
}
function lengthLabel(l: Length) { return l === 'short' ? 'مختصر' : l === 'expanded' ? 'موسّع' : 'متوسّط' }
onMounted(() => compose('medium'))

// ——— الثيمات ———
interface Theme { key: string, name: string, layout: 'single' | 'sidebar' | 'band' }
const THEMES: Theme[] = [
  { key: 'classic', name: 'كلاسيكيّ فاتح', layout: 'single' },
  { key: 'modern', name: 'عصريّ فاتح', layout: 'single' },
  { key: 'sidebar', name: 'مكس — جانبيّ ملوّن', layout: 'sidebar' },
  { key: 'band', name: 'مكس — ترويسة داكنة', layout: 'band' },
]
const theme = ref<Theme>(THEMES[2])
const ACCENTS = ['#0f6e56', '#185fa5', '#534ab7', '#993c1d', '#0d9488', '#b45309']
const accent = ref(ACCENTS[0])

// ——— الأقسام: ترتيب + إظهار (سحب) ———
interface Section { key: string, label: string, visible: boolean }
const sections = ref<Section[]>([
  { key: 'summary', label: 'النبذة', visible: true },
  { key: 'highlights', label: 'أبرز النقاط', visible: true },
  { key: 'skills', label: 'المهارات', visible: true },
  { key: 'experiences', label: 'الخبرات', visible: true },
  { key: 'certificates', label: 'الشهادات', visible: true },
  { key: 'links', label: 'الروابط', visible: true },
])
const dragIndex = ref<number | null>(null)
function onDragStart(i: number) { dragIndex.value = i }
function onDrop(i: number) {
  if (dragIndex.value === null || dragIndex.value === i) return
  const arr = sections.value
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(i, 0, moved)
  dragIndex.value = null
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= sections.value.length) return
  const arr = sections.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
const visibleOrdered = computed(() => sections.value.filter(s => s.visible))
function has(key: string) { return visibleOrdered.value.some(s => s.key === key) }
function orderIndex(key: string) { return visibleOrdered.value.findIndex(s => s.key === key) }

// ——— الروابط التفاعليّة ———
interface Link { id: number, label: string, url: string, icon: string }
const links = ref<Link[]>([
  { id: 1, label: 'LinkedIn', url: 'https://linkedin.com/in/', icon: 'mdi-linkedin' },
  { id: 2, label: 'GitHub', url: 'https://github.com/', icon: 'mdi-github' },
])
const newLink = reactive({ label: '', url: '' })
function addLink() {
  if (!newLink.label.trim() || !newLink.url.trim()) return
  links.value.push({ id: Date.now(), label: newLink.label.trim(), url: newLink.url.trim(), icon: guessIcon(newLink.url) })
  newLink.label = ''; newLink.url = ''
}
function guessIcon(url: string) {
  if (/linkedin/i.test(url)) return 'mdi-linkedin'
  if (/github/i.test(url)) return 'mdi-github'
  if (/behance|dribbble|portfolio/i.test(url)) return 'mdi-palette-outline'
  if (/twitter|x\.com/i.test(url)) return 'mdi-twitter'
  return 'mdi-link-variant'
}
function removeLink(id: number) { links.value = links.value.filter(l => l.id !== id) }

// ——— بيانات الترويسة ———
const person = computed(() => ({
  name: auth.authUser?.name ?? 'اسمك',
  email: auth.authUser?.email ?? '',
  phone: (auth.authUser as { phone?: string })?.phone ?? '',
}))

// ——— التصدير ———
function exportPdf() {
  toast('جارٍ فتح نافذة الطباعة — اختر «حفظ كـPDF». الروابط ستبقى قابلة للنقر.')
  setTimeout(() => window.print(), 400)
}
</script>

<template>
  <div class="cv-studio">
    <PageHeader title="استوديو السيرة الذاتيّة" subtitle="صياغة بالذكاء · ثيمات · ترتيب مرن · روابط تفاعليّة · تصدير PDF" icon="mdi-file-star-outline">
      <template #actions>
        <BaseButton variant="brand" size="sm" @click="exportPdf"><BaseIcon name="mdi-file-pdf-box" :size="18" />تصدير PDF</BaseButton>
      </template>
    </PageHeader>

    <div class="studio-grid">
      <!-- لوحة التحكّم -->
      <div class="controls no-print">
        <!-- الطول -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-robot-outline" :size="18" class="text-brand" /><h3>الصياغة بالذكاء</h3></div>
          <div class="seg">
            <button v-for="l in (['short','medium','expanded'] as Length[])" :key="l" class="seg-btn" :class="{ active: length === l }" :disabled="composing" @click="compose(l)">
              {{ lengthLabel(l) }}
            </button>
          </div>
          <div class="hint">
            <BaseIcon :name="composing ? 'mdi-loading' : (draft.live ? 'mdi-check-decagram' : 'mdi-information-outline')" :size="14" :class="composing ? 'animate-spin' : ''" />
            {{ composing ? 'يصوغ…' : (draft.live ? `مصاغ حيًّا (${draft.provider})` : 'محاكاة — فعّل مزوّدًا في حوكمة الذكاء لصياغة حقيقيّة') }}
          </div>
        </BaseCard>

        <!-- الثيم واللون -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-palette-swatch-outline" :size="18" class="text-brand" /><h3>الثيم والهويّة</h3></div>
          <div class="theme-grid">
            <button v-for="t in THEMES" :key="t.key" class="theme-chip" :class="{ active: theme.key === t.key }" @click="theme = t">{{ t.name }}</button>
          </div>
          <div class="swatches">
            <button v-for="c in ACCENTS" :key="c" class="swatch" :class="{ active: accent === c }" :style="{ background: c }" @click="accent = c" :aria-label="c" />
          </div>
        </BaseCard>

        <!-- ترتيب الأقسام -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-sort-variant" :size="18" class="text-brand" /><h3>ترتيب الأقسام</h3></div>
          <ul class="sec-list">
            <li v-for="(s, i) in sections" :key="s.key" class="sec-item" draggable="true" @dragstart="onDragStart(i)" @dragover.prevent @drop="onDrop(i)">
              <BaseIcon name="mdi-drag-vertical" :size="18" class="drag" />
              <input type="checkbox" v-model="s.visible" :aria-label="s.label">
              <span class="sec-label">{{ s.label }}</span>
              <button class="mini" :disabled="i === 0" @click="move(i, -1)"><BaseIcon name="mdi-chevron-up" :size="16" /></button>
              <button class="mini" :disabled="i === sections.length - 1" @click="move(i, 1)"><BaseIcon name="mdi-chevron-down" :size="16" /></button>
            </li>
          </ul>
        </BaseCard>

        <!-- الروابط -->
        <BaseCard>
          <div class="ctl-head"><BaseIcon name="mdi-link-variant" :size="18" class="text-brand" /><h3>روابط تفاعليّة</h3></div>
          <div v-for="l in links" :key="l.id" class="link-row">
            <BaseIcon :name="l.icon" :size="16" class="text-brand" />
            <span class="link-label">{{ l.label }}</span>
            <span class="link-url" dir="ltr">{{ l.url }}</span>
            <button class="mini" @click="removeLink(l.id)"><BaseIcon name="mdi-close" :size="14" /></button>
          </div>
          <div class="link-add">
            <BaseInput v-model="newLink.label" placeholder="التسمية (مثل: أعمالي)" />
            <BaseInput v-model="newLink.url" placeholder="https://" dir="ltr" />
            <BaseButton variant="tonal-accent" size="sm" @click="addLink"><BaseIcon name="mdi-plus" :size="16" />إضافة</BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- المعاينة الحيّة (A4) -->
      <div class="preview-wrap">
        <div class="page" :class="[`theme-${theme.key}`, `layout-${theme.layout}`]" :style="{ '--accent': accent }">
          <!-- ترويسة -->
          <header class="cv-head">
            <div class="cv-identity">
              <h1 class="cv-name">{{ person.name }}</h1>
              <p class="cv-headline">{{ draft.headline || profile.headline }}</p>
            </div>
            <div v-if="person.email || person.phone" class="cv-contact">
              <span v-if="person.email" dir="ltr"><BaseIcon name="mdi-email-outline" :size="13" /> {{ person.email }}</span>
              <span v-if="person.phone" dir="ltr"><BaseIcon name="mdi-phone-outline" :size="13" /> {{ person.phone }}</span>
            </div>
          </header>

          <div class="cv-body">
            <!-- عمود جانبيّ (للثيم الجانبيّ) -->
            <aside v-if="theme.layout === 'sidebar'" class="cv-aside">
              <template v-for="s in visibleOrdered" :key="`a-${s.key}`">
                <section v-if="s.key === 'skills' && profile.skills.length" class="cv-sec">
                  <h2>المهارات</h2>
                  <div class="chips">
                    <span v-for="sk in profile.skills" :key="sk.id" class="chip">{{ sk.name }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'certificates' && profile.certificates.length" class="cv-sec">
                  <h2>الشهادات</h2>
                  <div v-for="c in profile.certificates" :key="c.id" class="cert"><b>{{ c.name }}</b><span>{{ c.issuer }} · {{ c.date }}</span></div>
                </section>
                <section v-else-if="s.key === 'links' && links.length" class="cv-sec">
                  <h2>روابط</h2>
                  <a v-for="l in links" :key="l.id" class="cv-link" :href="l.url" target="_blank" rel="noopener"><BaseIcon :name="l.icon" :size="13" /> {{ l.label }}</a>
                </section>
              </template>
            </aside>

            <!-- العمود الرئيس -->
            <main class="cv-main">
              <template v-for="s in visibleOrdered" :key="`m-${s.key}`">
                <section v-if="s.key === 'summary' && draft.summary" class="cv-sec">
                  <h2>نبذة</h2>
                  <p class="cv-summary">{{ draft.summary }}</p>
                </section>

                <section v-else-if="s.key === 'highlights' && draft.highlights.length" class="cv-sec">
                  <h2>أبرز النقاط</h2>
                  <ul class="cv-highlights">
                    <li v-for="(h, hi) in draft.highlights" :key="hi">{{ h }}</li>
                  </ul>
                </section>

                <section v-else-if="s.key === 'experiences' && profile.experiences.length" class="cv-sec">
                  <h2>الخبرات</h2>
                  <div v-for="e in profile.experiences" :key="e.id" class="cv-exp">
                    <div class="cv-exp-top"><b>{{ e.title }}</b><span class="cv-exp-org">{{ e.company }}</span></div>
                    <span class="cv-exp-period">{{ e.period }}</span>
                    <p v-if="e.desc">{{ e.desc }}</p>
                  </div>
                </section>

                <!-- في الثيمات غير الجانبيّة تظهر المهارات/الشهادات/الروابط في الرئيس -->
                <section v-else-if="s.key === 'skills' && theme.layout !== 'sidebar' && profile.skills.length" class="cv-sec">
                  <h2>المهارات</h2>
                  <div class="chips">
                    <span v-for="sk in profile.skills" :key="sk.id" class="chip">{{ sk.name }}</span>
                  </div>
                </section>
                <section v-else-if="s.key === 'certificates' && theme.layout !== 'sidebar' && profile.certificates.length" class="cv-sec">
                  <h2>الشهادات</h2>
                  <div v-for="c in profile.certificates" :key="c.id" class="cert"><b>{{ c.name }}</b><span>{{ c.issuer }} · {{ c.date }}</span></div>
                </section>
                <section v-else-if="s.key === 'links' && theme.layout !== 'sidebar' && links.length" class="cv-sec">
                  <h2>روابط</h2>
                  <div class="link-inline">
                    <a v-for="l in links" :key="l.id" class="cv-link" :href="l.url" target="_blank" rel="noopener"><BaseIcon :name="l.icon" :size="13" /> {{ l.label }}</a>
                  </div>
                </section>
              </template>
            </main>
          </div>
        </div>
      </div>
    </div>

    <BaseSnackbar v-model="snack.show" color="success">{{ snack.text }}</BaseSnackbar>
  </div>
</template>

<style scoped>
.studio-grid { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; align-items: start; }
@media (max-width: 900px) { .studio-grid { grid-template-columns: 1fr; } }
.controls { display: flex; flex-direction: column; gap: 1rem; }
.ctl-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.ctl-head h3 { font-size: 14px; font-weight: 700; color: var(--v-text-content, inherit); }
.hint { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; color: rgba(var(--v-theme-on-surface), 0.6); }

.seg { display: flex; gap: 4px; background: rgba(var(--v-theme-on-surface), 0.05); border-radius: 10px; padding: 4px; }
.seg-btn { flex: 1; padding: 7px; border-radius: 7px; font-size: 13px; font-weight: 600; color: rgba(var(--v-theme-on-surface), 0.7); transition: all .15s; }
.seg-btn.active { background: rgb(var(--v-theme-brand, 16 110 86)); color: #fff; }

.theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.theme-chip { padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1.5px solid rgba(var(--v-theme-on-surface), 0.12); color: rgba(var(--v-theme-on-surface), 0.75); }
.theme-chip.active { border-color: rgb(var(--v-theme-brand, 16 110 86)); color: rgb(var(--v-theme-brand, 16 110 86)); }
.swatches { display: flex; gap: 8px; }
.swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; }
.swatch.active { border-color: rgba(var(--v-theme-on-surface), 0.5); outline: 2px solid #fff; }

.sec-list { display: flex; flex-direction: column; gap: 4px; }
.sec-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; background: rgba(var(--v-theme-on-surface), 0.03); cursor: grab; }
.sec-item .drag { color: rgba(var(--v-theme-on-surface), 0.35); }
.sec-label { flex: 1; font-size: 13px; }
.mini { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; color: rgba(var(--v-theme-on-surface), 0.6); }
.mini:hover:not(:disabled) { background: rgba(var(--v-theme-on-surface), 0.08); }
.mini:disabled { opacity: .3; }

.link-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06); }
.link-label { font-weight: 600; }
.link-url { flex: 1; color: rgba(var(--v-theme-on-surface), 0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-add { display: grid; gap: 6px; margin-top: 10px; }

/* ============ المعاينة A4 ============ */
.preview-wrap { display: flex; justify-content: center; }
.page {
  width: 210mm; max-width: 100%; min-height: 297mm; background: #fff; color: #1a1a1a;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18); border-radius: 6px; overflow: hidden;
  font-family: 'Tajawal', sans-serif; --ink: #1f2937; --muted: #6b7280;
}
.cv-head { padding: 28px 34px; }
.cv-name { font-size: 30px; font-weight: 800; color: var(--accent); line-height: 1.15; }
.cv-headline { font-size: 15px; color: var(--muted); margin-top: 4px; }
.cv-contact { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 12px; color: var(--muted); }
.cv-contact span { display: inline-flex; align-items: center; gap: 4px; }
.cv-body { display: block; }
.cv-main, .cv-aside { padding: 0 34px 30px; }
.cv-sec { margin-bottom: 18px; }
.cv-sec h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--accent); margin-bottom: 8px; }
.cv-summary { font-size: 13.5px; line-height: 1.85; color: var(--ink); }
.cv-highlights { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.cv-highlights li { position: relative; padding-inline-start: 16px; font-size: 13px; line-height: 1.7; color: var(--ink); }
.cv-highlights li::before { content: ''; position: absolute; inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--accent); inset-inline-start: 0; inset-block-start: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; padding: 3px 10px; border-radius: 20px; background: color-mix(in srgb, var(--accent) 12%, #fff); color: var(--accent); font-weight: 600; }
.cv-exp { margin-bottom: 12px; }
.cv-exp-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.cv-exp-top b { font-size: 14px; color: var(--ink); }
.cv-exp-org { font-size: 12.5px; color: var(--accent); font-weight: 600; }
.cv-exp-period { font-size: 11.5px; color: var(--muted); }
.cv-exp p { font-size: 12.5px; line-height: 1.7; color: var(--ink); margin-top: 3px; }
.cert { margin-bottom: 7px; font-size: 12.5px; }
.cert b { display: block; color: var(--ink); }
.cert span { color: var(--muted); font-size: 11.5px; }
.cv-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--accent); text-decoration: none; margin-inline-end: 14px; }
.cv-link:hover { text-decoration: underline; }
.link-inline { display: flex; flex-wrap: wrap; gap: 6px; }

/* الثيم: عصريّ فاتح — عناوين بخطّ سفليّ */
.theme-modern .cv-sec h2 { border-bottom: 2px solid color-mix(in srgb, var(--accent) 35%, #fff); padding-bottom: 4px; }
.theme-modern .cv-head { border-bottom: 3px solid var(--accent); }

/* الثيم: كلاسيكيّ — رماديّ هادئ */
.theme-classic .cv-name { color: var(--ink); }
.theme-classic .cv-sec h2 { color: var(--ink); border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
.theme-classic .cv-headline { color: var(--accent); font-weight: 600; }

/* الثيم: مكس جانبيّ ملوّن */
.layout-sidebar .cv-body { display: grid; grid-template-columns: 34% 1fr; }
.theme-sidebar .cv-head { background: var(--accent); padding-bottom: 22px; }
.theme-sidebar .cv-name, .theme-sidebar .cv-headline, .theme-sidebar .cv-contact { color: #fff; }
.theme-sidebar .cv-headline { opacity: .92; }
.theme-sidebar .cv-contact { opacity: .9; }
.theme-sidebar .cv-aside { background: color-mix(in srgb, var(--accent) 8%, #fff); padding-top: 24px; }
.theme-sidebar .cv-aside .cv-sec h2 { color: var(--accent); }
.theme-sidebar .cv-main { padding-top: 24px; }

/* الثيم: مكس ترويسة داكنة */
.theme-band .cv-head { background: #111827; padding-bottom: 24px; }
.theme-band .cv-name { color: #fff; }
.theme-band .cv-headline { color: var(--accent); font-weight: 700; }
.theme-band .cv-contact { color: #cbd5e1; }
.theme-band .cv-main { padding-top: 24px; }

/* ============ الطباعة ============ */
@media print {
  .no-print, :global(.app-sidebar), :global(.app-header), :global(header.banner) { display: none !important; }
  .studio-grid { grid-template-columns: 1fr !important; }
  .preview-wrap { display: block; }
  .page { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; min-height: auto !important; }
}
</style>
