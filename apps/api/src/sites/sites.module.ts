import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockAccess, BlockAccessController, BlockAccessService } from './block-access';
import { Site, SiteDomain, SslEvent } from './site.entity';
import { SitesService } from './sites.service';

/** Sites, their addresses and which built-in blocks each may use. Global: every module's services read the current site. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Site, SiteDomain, SslEvent, BlockAccess])],
  controllers: [BlockAccessController],
  providers: [SitesService, BlockAccessService],
  exports: [SitesService, BlockAccessService],
})
export class SitesModule {}
