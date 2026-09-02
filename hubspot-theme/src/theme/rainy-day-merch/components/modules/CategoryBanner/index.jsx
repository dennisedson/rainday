import { Island } from '@hubspot/cms-components';
import { ModuleFields, RepeatedFieldGroup, TextField, BooleanField, ImageField } from '@hubspot/cms-components/fields';
import CategoryBannerIsland from '../../islands/CategoryBannerIsland.jsx?island';

export function Component({ fieldValues = {}, ...props }) {
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island
      module={CategoryBannerIsland}
      siteName={siteName}
      categoryOverrides={fieldValues.categoryOverrides || []}
      shopAllImage={fieldValues.shopAllImage || null}
      fallbackImage={fieldValues.fallbackImage || null}
      showSaleBadge={fieldValues.showSaleBadge !== undefined ? fieldValues.showSaleBadge : true}
      showFeatures={fieldValues.showFeatures !== undefined ? fieldValues.showFeatures : true}
    />
  );
}

export const fields = (
  <ModuleFields>
    <RepeatedFieldGroup
      name="categoryOverrides"
      label="Category Custom Content"
      occurrence={{
        min: 0,
        max: 20,
        default: 0,
      }}
      default={[]}
    >
      <TextField
        name="categoryName"
        label="Category Name"
        required={true}
        default="All Products"
        helpText="Must exactly match Square category (e.g., 'Bracelets', 'Necklaces') or use 'All Products' for the Shop All page"
      />
      <TextField
        name="customDescription"
        label="Custom Description"
        required={true}
        default="Explore our handcrafted jewelry collection."
        helpText="Custom description text for this category banner"
      />
      <ImageField
        name="customImage"
        label="Custom Banner Image (Optional)"
        default={{
          src: '',
          alt: '',
        }}
        helpText="Upload a custom image. If empty, will use Square category image"
      />
    </RepeatedFieldGroup>

    <ImageField
      name="shopAllImage"
      label="Shop All Cover Photo"
      default={{ src: '', alt: '' }}
      helpText="The cover photo for the Shop All page. This page has no Square category, so it cannot inherit an image the way category pages do — set it here."
    />

    <ImageField
      name="fallbackImage"
      label="Fallback Cover Photo"
      default={{ src: '', alt: '' }}
      helpText="Used for any category that has no image set in Square. Without it those banners render empty."
    />

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

