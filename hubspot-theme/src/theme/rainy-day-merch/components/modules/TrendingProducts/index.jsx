import { Island } from '@hubspot/cms-components';
import {
  ModuleFields,
  TextField,
  NumberField,
  BooleanField,
} from '@hubspot/cms-components/fields';
import TrendingProductsIsland from '../../islands/TrendingProductsIsland.jsx?island';

export function Component({ fieldValues }) {
  const { sectionTitle, subtitle, showViewAll, viewAllLink, viewAllText, maxProducts } = fieldValues;

  return (
    <Island
      module={TrendingProductsIsland}
      sectionTitle={sectionTitle}
      subtitle={subtitle}
      showViewAll={showViewAll}
      viewAllLink={viewAllLink}
      viewAllText={viewAllText}
      maxProducts={maxProducts}
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
      helpText="Maximum number of products to show"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Trending Products',
  description: 'Display trending/featured products with View All link',
  icon: 'trending-up',
  categories: ['ecommerce', 'products'],
};

