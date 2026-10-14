import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Collection, CollectionItem, ItemTranslation } from './collections/collection.entity';
import { AiConnection } from './ai/ai-connection.entity';
import { config } from './config';
import { CustomBlock } from './custom-blocks/custom-block.entity';
import { FormSubmission } from './forms/form-submission.entity';
import { Media } from './media/media.entity';
import { Page, PageRevision, PageTranslation } from './pages/page.entity';
import { Redirect } from './redirects/redirects.module';
import { SiteSettings } from './settings/settings.entity';
import { Site, SiteDomain, SslEvent } from './sites/site.entity';
import { User } from './users/user.entity';

/** Shared by the app and the TypeORM CLI (`npm run migration:generate` / `migration:run`). */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: config.databaseUrl,
  entities: [
    Site,
    SiteDomain,
    SslEvent,
    User,
    Page,
    PageTranslation,
    PageRevision,
    Redirect,
    SiteSettings,
    Media,
    Collection,
    CollectionItem,
    ItemTranslation,
    FormSubmission,
    CustomBlock,
    AiConnection,
  ],
  migrations: [join(__dirname, 'migrations', '*.js')],
  migrationsTableName: 'migrations',
  // gen_random_uuid() is built into Postgres 13+, so no extension (or superuser) is needed.
  uuidExtension: 'pgcrypto',
};

export default new DataSource(dataSourceOptions);
