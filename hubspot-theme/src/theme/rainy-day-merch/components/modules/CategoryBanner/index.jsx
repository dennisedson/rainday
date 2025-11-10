import { Island } from '@hubspot/cms-components';
import { ModuleFields, RepeaterField, TextField, TextAreaField, BooleanField } from '@hubspot/cms-components/fields';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland.jsx?island';

export function Component({ fieldValues = {}, ...props }) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={CategoryBannerIsland} 
      siteName={siteName}
      categoryOverrides={fieldValues.categoryOverrides || []}
      showSaleBadge={fieldValues.showSaleBadge !== undefined ? fieldValues.showSaleBadge : true}
      showFeatures={fieldValues.showFeatures !== undefined ? fieldValues.showFeatures : true}
    />
  );
}

export const fields = (
  <ModuleFields>
    <RepeaterField
      name="categoryOverrides"
      label="Category Custom Content"
      default={[]}
      helpText="Override banner text for specific categories. Category name must exactly match Square category name."
    >
      <TextField
        name="categoryName"
        label="Category Name"
        required
        helpText="Must exactly match Square category (e.g., 'Bracelets', 'Necklaces')"
      />
      <TextAreaField
        name="customDescription"
        label="Custom Description"
        required
        rows={4}
        helpText="Custom description text for this category banner"
      />
    </RepeaterField>
    
    <BooleanField
      name="showSaleBadge"
      label="Show 'SALE' Badge"
      default={true}
      helpText="Display the orange SALE badge on all category banners"
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

