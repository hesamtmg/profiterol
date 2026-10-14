import { type BlockDef, withCommonFields } from '@profiterol/blocks';
import type { DataSource } from 'typeorm';
import { currentSiteId } from '../sites/site-context';
import { CustomBlock } from './custom-block.entity';

/**
 * The current site's approved custom blocks, with the shared fields. A plain function (not only a service method) so
 * modules that the custom blocks module itself depends on, like settings, can use it too.
 */
export async function liveCustomDefs(dataSource: DataSource): Promise<BlockDef[]> {
  const live = await dataSource.getRepository(CustomBlock).find({ where: { siteId: currentSiteId(), status: 'live' } });
  return live.flatMap((b) => (b.live ? [withCommonFields(b.live.def)] : []));
}
