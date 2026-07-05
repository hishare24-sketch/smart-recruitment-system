import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AccountState } from './account-state.entity'

@Injectable()
export class AccountStatesService {
  constructor(
    @InjectRepository(AccountState) private readonly states: Repository<AccountState>,
  ) {}

  /** كتلة المخزن للمستخدم — null إن لم تُحفظ بعد (يبقى البذر المحلي). */
  async get(userId: number, store: string): Promise<unknown> {
    const row = await this.states.findOne({ where: { userId, store } })
    return row ? row.data : null
  }

  /** upsert الكتلة (userId, store) — تُستبدل كما وردت. */
  async put(userId: number, store: string, data: unknown): Promise<{ ok: true }> {
    let row = await this.states.findOne({ where: { userId, store } })
    if (!row)
      row = this.states.create({ userId, store })
    row.data = data ?? null
    await this.states.save(row)
    return { ok: true }
  }
}
