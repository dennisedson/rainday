import {
  ModuleFields,
  TextField,
  ImageField,
  BooleanField,
  FieldGroup,
} from '@hubspot/cms-components/fields';
import ProductCard from '../../shared/ProductCard';
import Container from '../../shared/Container';

export function Component({ fieldValues }) {
  const { sectionTitle, product1, product2, product3 } = fieldValues;
  
  const products = [product1, product2, product3].filter(p => p?.title);

  return (
    <Container size="default" className="py-16">
      {sectionTitle && (
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
          {sectionTitle}
        </h2>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={index}
            id={product.id || `product-${index}`}
            image={product.image?.src || ''}
            title={product.title}
            category={product.category}
            price={parseFloat(product.price) || 0}
            originalPrice={product.originalPrice ? parseFloat(product.originalPrice) : null}
            rating={parseFloat(product.rating) || 0}
            reviewCount={parseInt(product.reviewCount) || 0}
            onSale={product.onSale || false}
            featured={product.featured || false}
          />
        ))}
      </div>
    </Container>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="sectionTitle"
      label="Section Title"
      default="Featured Products"
    />
    
    <FieldGroup name="product1" label="Product 1">
      <ImageField
        name="image"
        label="Product Image"
        resizable={true}
      />
      <TextField
        name="title"
        label="Product Title"
        default="Ethereal Gold Necklace"
      />
      <TextField
        name="category"
        label="Category"
        default="Necklaces"
      />
      <TextField
        name="price"
        label="Price"
        default="299.99"
      />
      <TextField
        name="originalPrice"
        label="Original Price (optional)"
        default=""
      />
      <TextField
        name="rating"
        label="Rating (0-5)"
        default="4.5"
      />
      <TextField
        name="reviewCount"
        label="Review Count"
        default="24"
      />
      <BooleanField
        name="onSale"
        label="On Sale"
        default={false}
      />
      <BooleanField
        name="featured"
        label="Featured"
        default={true}
      />
    </FieldGroup>
    
    <FieldGroup name="product2" label="Product 2">
      <ImageField
        name="image"
        label="Product Image"
        resizable={true}
      />
      <TextField
        name="title"
        label="Product Title"
        default="Diamond Earrings"
      />
      <TextField
        name="category"
        label="Category"
        default="Earrings"
      />
      <TextField
        name="price"
        label="Price"
        default="499.99"
      />
      <TextField
        name="originalPrice"
        label="Original Price (optional)"
        default=""
      />
      <TextField
        name="rating"
        label="Rating (0-5)"
        default="5.0"
      />
      <TextField
        name="reviewCount"
        label="Review Count"
        default="18"
      />
      <BooleanField
        name="onSale"
        label="On Sale"
        default={false}
      />
      <BooleanField
        name="featured"
        label="Featured"
        default={true}
      />
    </FieldGroup>
    
    <FieldGroup name="product3" label="Product 3">
      <ImageField
        name="image"
        label="Product Image"
        resizable={true}
      />
      <TextField
        name="title"
        label="Product Title"
        default="Gold Bracelet"
      />
      <TextField
        name="category"
        label="Category"
        default="Bracelets"
      />
      <TextField
        name="price"
        label="Price"
        default="199.99"
      />
      <TextField
        name="originalPrice"
        label="Original Price (optional)"
        default="249.99"
      />
      <TextField
        name="rating"
        label="Rating (0-5)"
        default="4.8"
      />
      <TextField
        name="reviewCount"
        label="Review Count"
        default="32"
      />
      <BooleanField
        name="onSale"
        label="On Sale"
        default={true}
      />
      <BooleanField
        name="featured"
        label="Featured"
        default={false}
      />
    </FieldGroup>
  </ModuleFields>
);

export const meta = {
  label: 'Product Showcase',
  description: 'Display up to 3 product cards with editable content',
  icon: 'grid',
  categories: ['ecommerce', 'products'],
};
