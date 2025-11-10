import { Island, ModuleFields } from '@hubspot/cms-components';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland';

export default function CategoryBanner(props) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={CategoryBannerIsland} 
      siteName={siteName}
    />
  );
}

// Required for HubSpot CMS modules
export const fields = <ModuleFields />;

