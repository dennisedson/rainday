import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland.jsx?island';

export function Component(props) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={CategoryBannerIsland} 
      siteName={siteName}
    />
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Category Banner',
  description: 'Dynamic banner that changes based on category URL parameter',
  icon: 'image',
  categories: ['ecommerce', 'banners'],
};

