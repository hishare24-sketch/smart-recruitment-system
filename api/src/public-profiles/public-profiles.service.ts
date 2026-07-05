import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProfileService } from '../profile/profile.service'
import { PublicProfile } from './public-profile.entity'
import type { PageComment, Testimonial } from './public-profile.entity'
import type {
  CommentDto,
  ContactDto,
  ProofRequestDto,
  RateDto,
  ScheduleDto,
  TestimonialDto,
  UpdatePublicProfileDto,
} from './dto/public-profile.dto'

function nextId(items: { id: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1
}

function slugify(name: string, fallback: number): string {
  const base = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `user-${fallback}`
}

@Injectable()
export class PublicProfilesService {
  constructor(
    @InjectRepository(PublicProfile) private readonly pages: Repository<PublicProfile>,
    private readonly profileService: ProfileService,
  ) {}

  private async bySlugOrFail(slug: string): Promise<PublicProfile> {
    const page = await this.pages.findOne({ where: { slug } })
    if (!page)
      throw new NotFoundException('الصفحة غير موجودة')
    return page
  }

  /**
   * شكل العرض العام: أعمدة الكيان + وثيقة `doc` تعلوها،
   * مع إخفاء الداخلي (inbox/userId/doc). doc مصدر العرض؛ stats/slug من الأعمدة.
   */
  private present(p: PublicProfile): Record<string, unknown> {
    const { doc, inbox, userId, ...cols } = p
    void inbox
    void userId
    return { ...cols, ...(doc ?? {}) }
  }

  async getBySlug(slug: string): Promise<Record<string, unknown>> {
    return this.present(await this.bySlugOrFail(slug))
  }

  /** صفحة المالك — تُنشأ عند أول وصول بـ slug مشتقّ من الاسم. */
  async getOrCreateForUser(userId: number, name: string): Promise<PublicProfile> {
    let page = await this.pages.findOne({ where: { userId } })
    if (!page) {
      let slug = slugify(name, userId)
      if (await this.pages.findOne({ where: { slug } }))
        slug = `${slug}-${userId}`
      page = this.pages.create({ userId, slug, displayName: name })
      await this.pages.save(page)
    }
    return page
  }

  /**
   * صفحة المالك للتحرير/الإماهة (get-or-create). تُعيد `doc` صريحةً (لا مسطّحة)
   * كي يميّز المخزن الصفحة الفارغة فيبقي البذرة، مع `stats` الحيّة و`slug` المرجع.
   */
  async getMine(userId: number, name: string): Promise<{ slug: string, stats: PublicProfile['stats'], doc: Record<string, unknown> }> {
    const p = await this.getOrCreateForUser(userId, name)
    return { slug: p.slug, stats: p.stats, doc: p.doc }
  }

  async update(userId: number, name: string, dto: UpdatePublicProfileDto): Promise<Record<string, unknown>> {
    const page = await this.getOrCreateForUser(userId, name)
    // المخزن يرسل الوثيقة الكاملة تحت doc؛ الحقول المُصنَّفة (لو أُرسلت) تُدمج للعرض/البحث
    const { doc, ...typed } = dto
    Object.assign(page, typed)
    if (doc !== undefined)
      page.doc = doc
    await this.pages.save(page)
    return this.present(page)
  }

  async registerView(slug: string): Promise<void> {
    const page = await this.bySlugOrFail(slug)
    page.stats = { ...page.stats, views: page.stats.views + 1 }
    await this.pages.save(page)
  }

  async toggleFollow(slug: string, following?: boolean): Promise<{ following: boolean, followersCount: number }> {
    const page = await this.bySlugOrFail(slug)
    // بلا هوية زائر: القيمة المطلوبة إن وُجدت، وإلا زيادة بسيطة (متابعة).
    const next = following ?? true
    const delta = next ? 1 : -1
    const followersCount = Math.max(0, page.stats.followersCount + delta)
    page.stats = { ...page.stats, followersCount }
    await this.pages.save(page)
    return { following: next, followersCount }
  }

  async rate(slug: string, dto: RateDto): Promise<{ avgRating: number, ratingCount: number }> {
    const page = await this.bySlugOrFail(slug)
    const { avgRating, ratingCount } = page.stats
    const newCount = ratingCount + 1
    const newAvg = Math.round(((avgRating * ratingCount + dto.stars) / newCount) * 100) / 100
    page.stats = { ...page.stats, avgRating: newAvg, ratingCount: newCount }
    await this.pages.save(page)
    return { avgRating: newAvg, ratingCount: newCount }
  }

  async addComment(slug: string, dto: CommentDto): Promise<PageComment> {
    const page = await this.bySlugOrFail(slug)
    const comment: PageComment = {
      id: nextId(page.comments),
      author: dto.author,
      text: dto.text,
      date: new Date().toISOString().slice(0, 10),
      hidden: false, // يظهر ويُخضعه المالك للإشراف (إخفاء عبر PATCH /me)
    }
    page.comments = [...page.comments, comment]
    await this.pages.save(page)
    return comment
  }

  async contact(slug: string, dto: ContactDto): Promise<void> {
    const page = await this.bySlugOrFail(slug)
    page.inbox = [...page.inbox, { kind: 'contact', ...dto, at: new Date().toISOString() }]
    page.stats = { ...page.stats, contacts: page.stats.contacts + 1 }
    await this.pages.save(page)
  }

  async schedule(slug: string, dto: ScheduleDto): Promise<void> {
    const page = await this.bySlugOrFail(slug)
    page.inbox = [...page.inbox, { kind: 'schedule', ...dto, at: new Date().toISOString() }]
    page.stats = { ...page.stats, meetings: page.stats.meetings + 1 }
    await this.pages.save(page)
  }

  async addTestimonial(slug: string, dto: TestimonialDto): Promise<Testimonial> {
    const page = await this.bySlugOrFail(slug)
    const testimonial: Testimonial = {
      id: nextId(page.testimonials),
      author: dto.author,
      authorRole: dto.authorRole,
      excerpt: dto.excerpt,
      visible: false, // مخفية حتى موافقة صاحب الصفحة
      likes: 0,
    }
    page.testimonials = [...page.testimonials, testimonial]
    await this.pages.save(page)
    return testimonial
  }

  /** زائر يطلب إثبات مهارة → يصل مالك الصفحة في ملفه الخاص. */
  async requestProof(slug: string, dto: ProofRequestDto): Promise<void> {
    const page = await this.bySlugOrFail(slug)
    await this.profileService.pushProofRequest(page.userId, dto)
  }
}
