import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CustomBlock } from './custom-block.entity';
import { AdminCustomBlocksController, PublicCustomBlocksController } from './custom-blocks.controller';
import { CustomBlocksService } from './custom-blocks.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomBlock]), AiModule],
  controllers: [AdminCustomBlocksController, PublicCustomBlocksController],
  providers: [CustomBlocksService],
  exports: [CustomBlocksService],
})
export class CustomBlocksModule {}
