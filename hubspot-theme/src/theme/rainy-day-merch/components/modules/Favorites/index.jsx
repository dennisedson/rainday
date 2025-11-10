import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import FavoritesIsland from '../../islands/FavoritesIsland.jsx?island';

export function Component({ ...props }) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={FavoritesIsland} 
      siteName={siteName}
    />
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Favorites Page',
  description: 'Displays all favorited products',
  icon: 'heart',
  categories: ['ecommerce', 'pages'],
};

