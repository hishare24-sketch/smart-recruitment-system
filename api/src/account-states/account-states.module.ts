import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccountState } from './account-state.entity'
import { AccountStatesController } from './account-states.controller'
import { AccountStatesService } from './account-states.service'

@Module({
  imports: [TypeOrmModule.forFeature([AccountState])],
  controllers: [AccountStatesController],
  providers: [AccountStatesService],
})
export class AccountStatesModule {}
