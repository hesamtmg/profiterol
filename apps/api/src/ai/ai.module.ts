import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConnection } from './ai-connection.entity';
import { AiConnectionsController, AiConnectionsService } from './ai-connections';

@Module({
  imports: [TypeOrmModule.forFeature([AiConnection])],
  controllers: [AiConnectionsController],
  providers: [AiConnectionsService],
  exports: [AiConnectionsService],
})
export class AiModule {}
