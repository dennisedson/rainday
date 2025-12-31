import { Island } from '@hubspot/cms-components';
import {
  ModuleFields,
  TextField,
  NumberField,
  BooleanField,
  RepeatedFieldGroup,
} from '@hubspot/cms-components/fields';
import TrendingProductsIsland from '../../islands/TrendingProductsIsland.jsx?island';

export function Component({ fieldValues }) {
  const { 
    sectionTitle, 
    subtitle, 
    showViewAll, 
    viewAllLink, 
    viewAllText, 
    maxProducts,
    manualProducts 
  } = fieldValues;

  return (
    <Island
      module={TrendingProductsIsland}
      sectionTitle={sectionTitle}
      subtitle={subtitle}
      showViewAll={showViewAll}
      viewAllLink={viewAllLink}
      viewAllText={viewAllText}
      maxProducts={maxProducts}
      manualProducts={manualProducts}
    />
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="sectionTitle"
      label="Section Title"
      default="Trending Now"
      helpText="Main heading for the trending section"
    />
    <TextField
      name="subtitle"
      label="Subtitle"
      default="See what popular items are hot this month"
      helpText="Description text below the title"
    />

    <RepeatedFieldGroup
      name="manualProducts"
      label="Specific Products (Optional)"
      helpText="Add specific Square Product IDs to show. If left empty, random products will be shown."
      itemLabel={(item) => item.productId || 'New Product'}
      default={[]}
    >
      <TextField
        name="productId"
        label="Square Product ID"
        placeholder="e.g. 5R3B... "
      />
    </RepeatedFieldGroup>

    <BooleanField
      name="showViewAll"
      label="Show 'View All' Link"
      default={true}
    />
    <TextField
      name="viewAllText"
      label="View All Text"
      default="View All"
      helpText="Text for the view all link"
    />
    <TextField
      name="viewAllLink"
      label="View All Link"
      default="/shop"
      helpText="URL for the view all link"
    />
    <NumberField
      name="maxProducts"
      label="Max Products to Display"
      default={4}
      min={1}
      max={12}
      helpText="Maximum number of products to show (only used for random selection)"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Trending Products',
  description: 'Display trending/featured products with View All link',
  icon: 'trending-up',
  categories: ['ecommerce', 'products'],
};

