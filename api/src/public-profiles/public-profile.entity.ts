import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

export interface Testimonial {
  id: number
  author: string
  authorRole?: string
  excerpt: string
  visible: boolean
  likes: number
}

export interface PageComment {
  id: number
  author: string
  text: string
  date: string
  hidden: boolean
}

export interface PublicStats {
  views: number
  shares: number
  contacts: number
  meetings: number
  followersCount: number
  avgRating: number
  ratingCount: number
}

/**
 * الصفحة التعريفية العامة — صفّ واحد لكل مستخدم، مفتاحها slug.
 * تطابق PublicProfileState في PublicProfileStore.ts (المصدر المرجعي).
 * حقول العرض تُخزَّن كما هي؛ العدّادات والتفاعلات (testimonials/comments/stats)
 * تُحدَّث عبر نقاط عامة بلا مصادقة.
 */
@Entity('public_profiles')
export class PublicProfile {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true })
  userId!: number

  @Column({ unique: true })
  slug!: string

  @Column({ default: '' })
  displayName!: string

  @Column({ default: '' })
  publicHeadline!: string

  @Column({ default: '' })
  tagline!: string

  @Column({ type: 'text', default: '' })
  bioShort!: string

  @Column({ type: 'text', default: '' })
  story!: string

  @Column({ type: 'simple-json', default: '[]' })
  keywords!: string[]

  @Column({ default: '' })
  location!: string

  @Column({ default: '' })
  timezone!: string

  @Column({ type: 'varchar', nullable: true })
  avatarImage!: string | null

  @Column({ type: 'simple-json', default: '{}' })
  availability!: Record<string, unknown>

  @Column({ type: 'simple-json', default: '{}' })
  appearance!: Record<string, unknown>

  @Column({ type: 'simple-json', default: '[]' })
  sectionOrder!: string[]

  @Column({ type: 'simple-json', default: '{}' })
  sections!: Record<string, boolean>

  @Column({ type: 'simple-json', default: '{}' })
  links!: Record<string, string>

  @Column({ type: 'simple-json', default: '[]' })
  customLinks!: Array<{ id: number, label: string, url: string }>

  @Column({ type: 'simple-json', default: '[]' })
  achievements!: Array<{ id: number, text: string, kind: 'self' | 'verified' }>

  @Column({ type: 'simple-json', default: '[]' })
  portfolio!: Array<Record<string, unknown>>

  @Column({ type: 'simple-json', default: '[]' })
  testimonials!: Testimonial[]

  @Column({ type: 'simple-json', default: '[]' })
  comments!: PageComment[]

  @Column({ type: 'simple-json', default: '{"views":0,"shares":0,"contacts":0,"meetings":0,"followersCount":0,"avgRating":0,"ratingCount":0}' })
  stats!: PublicStats

  // وارد داخلي (رسائل «تواصل معي» + اقتراحات المواعيد) — لا يظهر في الصفحة العامة
  @Column({ type: 'simple-json', default: '[]' })
  inbox!: Array<Record<string, unknown>>

  // وثيقة العرض الكاملة كما يحملها المخزن (PublicProfileState) — كتلة واحدة
  // تفادي تعداد عشرات الأعمدة؛ تُغطّي الحقول التي لا يمثّلها المخطط المُصنَّف.
  @Column({ type: 'simple-json', default: '{}' })
  doc!: Record<string, unknown>
}
