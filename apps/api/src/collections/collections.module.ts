import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { Collection, CollectionItem, ItemTranslation } from './collection.entity';
import { AdminCollectionsController, PublicCollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, CollectionItem, ItemTranslation]), MediaModule],
  controllers: [AdminCollectionsController, PublicCollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
