import { Island } from '@hubspot/cms-components';
import { ModuleFields, TextField, TextAreaField, BooleanField } from '@hubspot/cms-components/fields';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland.jsx?island';

export function Component({ fieldValues = {}, ...props }) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={CategoryBannerIsland} 
      siteName={siteName}
      customTitle={fieldValues.customTitle || ''}
      customDescription={fieldValues.customDescription || ''}
      showSaleBadge={fieldValues.showSaleBadge !== undefined ? fieldValues.showSaleBadge : true}
      showFeatures={fieldValues.showFeatures !== undefined ? fieldValues.showFeatures : true}
    />
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="customTitle"
      label="Custom Banner Title"
      helpText="Override the default category title. Leave empty to use category name from URL."
    />
    
    <TextAreaField
      name="customDescription"
      label="Custom Banner Description"
      helpText="Override the default category description. Leave empty to use default text."
      rows={4}
    />
    
    <BooleanField
      name="showSaleBadge"
      label="Show 'SALE' Badge"
      default={true}
      helpText="Display the orange SALE badge at the top of the banner"
    />
    
    <BooleanField
      name="showFeatures"
      label="Show Feature Icons"
      default={true}
      helpText="Display the Handcrafted, Premium Materials, and Gift Ready icons"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Category Banner',
  description: 'Dynamic banner that changes based on category URL parameter',
  icon: 'image',
  categories: ['ecommerce', 'banners'],
};

