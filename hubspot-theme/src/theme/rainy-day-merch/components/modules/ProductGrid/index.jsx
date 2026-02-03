import { Island } from '@hubspot/cms-components';
import {
  ModuleFields,
  TextField,
  ChoiceField,
} from '@hubspot/cms-components/fields';
import ProductGridIsland from '../../islands/ProductGridIsland.jsx?island';

export function Component({ fieldValues, ...props }) {
  const { sectionTitle, category, sortBy, columnsDesktop } = fieldValues;
  
  // Get site name from HubSpot settings
  const siteName = props.content?.website_settings?.website_header?.company_name || 'Rainy Day Merchandise';
  
  return (
    <Island 
      module={ProductGridIsland}
      sectionTitle={sectionTitle}
      category={category}
      sortBy={sortBy}
      columnsDesktop={columnsDesktop}
      siteName={siteName}
    />
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="sectionTitle"
      label="Section Title"
      default="Our Products"
      helpText="Main heading for the product grid"
    />
    
    <ChoiceField
      name="category"
      label="Filter by Category"
      default="all"
      choices={[
        ['all', 'All Products'],
        ['Necklaces', 'Necklaces'],
        ['Earrings', 'Earrings'],
        ['Bracelets', 'Bracelets'],
        ['Keychains', 'Keychains'],
        ['Lanyards', 'Lanyards'],
      ]}
      display="select"
      helpText="Filter products by category (must exactly match Square category names)"
    />
    
    <ChoiceField
      name="sortBy"
      label="Sort Products By"
      default="default"
      choices={[
        ['default', 'Default'],
        ['price-low', 'Price: Low to High'],
        ['price-high', 'Price: High to Low'],
      ]}
      display="select"
      helpText="Sort order for displayed products"
    />
    
    <ChoiceField
      name="columnsDesktop"
      label="Columns on Desktop"
      default="4"
      choices={[
        ['3', '3 Columns'],
        ['4', '4 Columns'],
        ['5', '5 Columns'],
      ]}
      display="radio"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Product Grid',
  description: 'Display a grid of products with filtering and sorting options',
  icon: 'grid',
  categories: ['ecommerce', 'products'],
};

