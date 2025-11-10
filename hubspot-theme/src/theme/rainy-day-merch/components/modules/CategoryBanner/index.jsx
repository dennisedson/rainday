import { Island, ModuleFields } from '@hubspot/cms-components';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland';

export default function CategoryBanner() {
  return (
    <Island module={CategoryBannerIsland} />
  );
}

// Required for HubSpot CMS modules
export const fields = <ModuleFields />;

