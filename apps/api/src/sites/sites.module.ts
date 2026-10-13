import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site, SiteDomain, SslEvent } from './site.entity';
import { SitesService } from './sites.service';

/** Sites and their addresses. Global: every module's services read the current site. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Site, SiteDomain, SslEvent])],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
