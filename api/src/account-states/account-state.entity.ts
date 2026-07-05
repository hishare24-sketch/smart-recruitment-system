import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

/**
 * مستند خاص عام (blob) لكل (مستخدم × مخزن) — يقابل جدول Supabase account_states.
 * يخدم المخازن التي لا مورد مخصّص لها (قوائم المستخدم الخاصة تُحفظ ككتلة JSON).
 */
@Entity('account_states')
@Unique(['userId', 'store'])
export class AccountState {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  userId!: number

  @Column()
  store!: string

  @Column({ type: 'simple-json', default: 'null' })
  data!: unknown

  @UpdateDateColumn()
  updated_at!: Date
}
