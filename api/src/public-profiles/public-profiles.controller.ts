import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import type { User } from '../users/user.entity'
import { PublicProfilesService } from './public-profiles.service'
import {
  CommentDto,
  ContactDto,
  FollowDto,
  ProofRequestDto,
  RateDto,
  ScheduleDto,
  TestimonialDto,
  UpdatePublicProfileDto,
} from './dto/public-profile.dto'

/** الصفحة التعريفية العامة — يطابق /public-profiles/* في ../api/openapi.yaml. */
@Controller('public-profiles')
export class PublicProfilesController {
  constructor(private readonly service: PublicProfilesService) {}

  // ----- المالك (محمي) -----
  @Get('me')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: User) {
    return this.service.getMine(user.id, user.name)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMine(@CurrentUser() user: User, @Body() dto: UpdatePublicProfileDto) {
    return this.service.update(user.id, user.name, dto)
  }

  // ----- عام (بلا مصادقة) -----
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug)
  }

  @Post(':slug/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  view(@Param('slug') slug: string) {
    return this.service.registerView(slug)
  }

  @Post(':slug/follow')
  @HttpCode(HttpStatus.OK)
  follow(@Param('slug') slug: string, @Body() dto: FollowDto) {
    return this.service.toggleFollow(slug, dto.following)
  }

  @Post(':slug/rate')
  @HttpCode(HttpStatus.OK)
  rate(@Param('slug') slug: string, @Body() dto: RateDto) {
    return this.service.rate(slug, dto)
  }

  @Post(':slug/comments')
  @HttpCode(HttpStatus.CREATED)
  comment(@Param('slug') slug: string, @Body() dto: CommentDto) {
    return this.service.addComment(slug, dto)
  }

  @Post(':slug/contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  contact(@Param('slug') slug: string, @Body() dto: ContactDto) {
    return this.service.contact(slug, dto)
  }

  @Post(':slug/schedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  schedule(@Param('slug') slug: string, @Body() dto: ScheduleDto) {
    return this.service.schedule(slug, dto)
  }

  @Post(':slug/testimonials')
  @HttpCode(HttpStatus.CREATED)
  testimonial(@Param('slug') slug: string, @Body() dto: TestimonialDto) {
    return this.service.addTestimonial(slug, dto)
  }

  @Post(':slug/proof-requests')
  @HttpCode(HttpStatus.NO_CONTENT)
  proofRequest(@Param('slug') slug: string, @Body() dto: ProofRequestDto) {
    return this.service.requestProof(slug, dto)
  }
}
