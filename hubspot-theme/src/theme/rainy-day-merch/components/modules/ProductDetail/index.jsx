import { Island } from '@hubspot/cms-components';
import {
  ModuleFields,
  TextField,
  ImageField,
  NumberField,
} from '@hubspot/cms-components/fields';
import ProductDetailIsland from '../../islands/ProductDetailIsland.jsx?island';

export function Component({ fieldValues }) {
  const {
    productName,
    price,
    description,
    mainImage,
    gallery1,
    gallery2,
    gallery3,
  } = fieldValues;
  
  // Build fallback data from field values (used if no product ID in URL)
  const fallbackData = productName ? {
    name: productName,
    price: price || 0,
    description: description,
    mainImage: mainImage?.src || 'https://via.placeholder.com/800',
    galleryImages: [gallery1?.src, gallery2?.src, gallery3?.src].filter(Boolean),
  } : null;

  return (
    <Island 
      module={ProductDetailIsland}
      fallbackData={fallbackData}
    />
  );
}

// Keep original fields for fallback/preview in HubSpot editor
export const fields = (
  <ModuleFields>
    {/* Product Basic Info - Used as fallback */}
    <TextField
      name="productName"
      label="Product Name (Fallback)"
      default="Luminous Pearl Necklace"
      helpText="Used only if no product ID in URL"
    />
    <NumberField
      name="price"
      label="Price (Fallback)"
      default={849}
      helpText="Used only if no product ID in URL"
    />
    <TextField
      name="description"
      label="Short Description (Fallback)"
      default="Handcrafted with 18k gold and lustrous freshwater pearls"
    />
    <ImageField
      name="mainImage"
      label="Main Product Image (Fallback)"
      resizable={true}
    />
    <ImageField
      name="gallery1"
      label="Gallery Image 2 (Fallback)"
      resizable={true}
    />
    <ImageField
      name="gallery2"
      label="Gallery Image 3 (Fallback)"
      resizable={true}
    />
    <ImageField
      name="gallery3"
      label="Gallery Image 4 (Fallback)"
      resizable={true}
    />
  </ModuleFields>
);

export const meta = {
  label: 'Product Detail',
  description: 'Display product details from Square API - fetches data based on URL product ID parameter',
  icon: 'shopping-bag',
  categories: ['ecommerce', 'product'],
};
