import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

/** تحديث الصفحة من المالك — كل الحقول اختيارية، تُدمج مع الموجود. */
export class UpdatePublicProfileDto {
  @IsOptional() @IsString() @MaxLength(120) displayName?: string
  @IsOptional() @IsString() @MaxLength(255) publicHeadline?: string
  @IsOptional() @IsString() @MaxLength(255) tagline?: string
  @IsOptional() @IsString() @MaxLength(1000) bioShort?: string
  @IsOptional() @IsString() @MaxLength(5000) story?: string
  @IsOptional() @IsArray() keywords?: string[]
  @IsOptional() @IsString() @MaxLength(120) location?: string
  @IsOptional() @IsString() @MaxLength(120) timezone?: string
  @IsOptional() @IsString() avatarImage?: string | null
  @IsOptional() @IsObject() availability?: Record<string, unknown>
  @IsOptional() @IsObject() appearance?: Record<string, unknown>
  @IsOptional() @IsArray() sectionOrder?: string[]
  @IsOptional() @IsObject() sections?: Record<string, boolean>
  @IsOptional() @IsObject() links?: Record<string, string>
  @IsOptional() @IsArray() customLinks?: Array<{ id: number, label: string, url: string }>
  @IsOptional() @IsArray() achievements?: Array<{ id: number, text: string, kind: 'self' | 'verified' }>
  @IsOptional() @IsArray() portfolio?: Array<Record<string, unknown>>
  // تعديل قائمتي التوصيات/التعليقات (إشراف: إظهار/إخفاء)
  @IsOptional() @IsArray() testimonials?: unknown[]
  @IsOptional() @IsArray() comments?: unknown[]
  // وثيقة العرض الكاملة من المخزن (PublicProfileState) — كتلة واحدة
  @IsOptional() @IsObject() doc?: Record<string, unknown>
}

export class FollowDto {
  @IsOptional() @IsBoolean() following?: boolean
}

export class RateDto {
  @IsInt() @Min(1) @Max(5) stars!: number
}

export class CommentDto {
  @IsString() @MaxLength(120) author!: string
  @IsString() @MaxLength(1000) text!: string
}

export class ContactDto {
  @IsString() @MaxLength(120) visitorName!: string
  @IsString() @MaxLength(2000) text!: string
}

export class ScheduleDto {
  @IsString() @MaxLength(120) visitorName!: string
  @IsString() @MaxLength(60) day!: string
  @IsString() @MaxLength(60) slot!: string
  @IsOptional() @IsString() @MaxLength(255) topic?: string
}

export class TestimonialDto {
  @IsString() @MaxLength(120) author!: string
  @IsOptional() @IsString() @MaxLength(120) authorRole?: string
  @IsString() @MaxLength(1000) excerpt!: string
}

export class ProofRequestDto {
  @IsString() @MaxLength(120) skill!: string
  @IsString() @MaxLength(120) from!: string
  @IsOptional() @IsString() @MaxLength(120) relation?: string
}
