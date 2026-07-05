import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../common/current-user.decorator'
import type { User } from '../users/user.entity'
import { AccountStatesService } from './account-states.service'

/**
 * مستندات خاصة عامة (blob) — يقابل مزامنة Supabase account_states.
 * كل مخزن بلا مورد مخصّص يحفظ كتلته هنا لكل مستخدم.
 */
@Controller('account-states')
@UseGuards(JwtAuthGuard)
export class AccountStatesController {
  constructor(private readonly service: AccountStatesService) {}

  @Get(':store')
  get(@CurrentUser() user: User, @Param('store') store: string) {
    return this.service.get(user.id, store)
  }

  @Put(':store')
  put(@CurrentUser() user: User, @Param('store') store: string, @Body() body: { data: unknown }) {
    return this.service.put(user.id, store, body?.data)
  }
}
