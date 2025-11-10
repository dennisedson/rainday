import {
  ModuleFields,
  TextField,
  ImageField,
  NumberField,
  BooleanField,
  RichTextField,
} from '@hubspot/cms-components/fields';

export function Component({ fieldValues }) {
  const {
    productName,
    price,
    originalPrice,
    rating,
    reviewCount,
    badge,
    stockStatus,
    description,
    mainImage,
    gallery1,
    gallery2,
    gallery3,
    hasShipping,
    hasWarranty,
    hasReturns,
    shippingText,
    warrantyText,
    returnsText,
    descriptionTab,
    features,
    careInstructions,
  } = fieldValues;

  return (
    <div className="bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/" className="hover:text-gray-900">Home</a>
          <span>&gt;</span>
          <a href="/jewelry" className="hover:text-gray-900">Jewelry</a>
          <span>&gt;</span>
          <a href="/jewelry/necklaces" className="hover:text-gray-900">Necklaces</a>
          <span>&gt;</span>
          <span className="text-gray-900">{productName || 'Product'}</span>
        </nav>
      </div>

      {/* Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left: Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              {mainImage?.src ? (
                <img
                  src={mainImage.src}
                  alt={mainImage.alt || productName}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-4 gap-4">
              {[mainImage, gallery1, gallery2, gallery3].map((img, idx) => (
                img?.src && (
                  <button
                    key={idx}
                    className="border-2 border-gray-300 rounded-lg overflow-hidden hover:border-primary transition-colors"
                  >
                    <img
                      src={img.src}
                      alt={img.alt || `Gallery ${idx + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                  </button>
                )
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-3 mb-3">
              {badge && (
                <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                  {badge}
                </span>
              )}
              {stockStatus && (
                <span className="text-sm text-gray-600">{stockStatus}</span>
              )}
            </div>

            {/* Product Name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {productName || 'Product Name'}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(rating || 5) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating || '5.0'} ({reviewCount || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-gray-900">
                  ${price || '0.00'}
                </span>
                {originalPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    ${originalPrice}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {description}
              </p>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-quantity-decrease
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors bg-white text-gray-700 font-normal"
                  aria-label="Decrease quantity"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <span className="text-xl leading-none">−</span>
                </button>
                <input
                  id="product-quantity"
                  type="text"
                  defaultValue="1"
                  readOnly
                  className="w-16 h-10 text-center border border-gray-300 rounded font-semibold bg-white text-gray-900"
                  style={{ MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none', color: '#111827' }}
                />
                <button
                  type="button"
                  data-quantity-increase
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors bg-white text-gray-700 font-normal"
                  aria-label="Increase quantity"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                data-add-to-cart
                className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Add to Cart
              </button>
              <button
                id="wishlist-btn"
                className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Add to wishlist"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button
                data-share
                className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Share via email"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* Buy Now Button */}
            <button
              data-buy-now
              className="w-full bg-white border-2 border-gray-900 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors mb-6"
            >
              Buy Now
            </button>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-6 py-6 border-t border-gray-200">
              {hasShipping && (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{shippingText || 'Free Shipping'}</p>
                </div>
              )}
              {hasWarranty && (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{warrantyText || '1 Year Warranty'}</p>
                </div>
              )}
              {hasReturns && (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{returnsText || '30-Day Returns'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Details Section - Only show if there's content */}
        {(features || careInstructions) && (
          <div className="mt-16 border-t border-gray-200 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Details</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Features */}
              {features && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: features }} />
                </div>
              )}
              
              {/* Care Instructions */}
              {careInstructions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Care Instructions</h3>
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: careInstructions }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Client-side script for interactive elements */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          // Wait for DOM to be ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initProductDetail);
          } else {
            initProductDetail();
          }
          
          function initProductDetail() {
            // Quantity controls
            const quantityInput = document.getElementById('product-quantity');
            const decreaseBtn = document.querySelector('[data-quantity-decrease]');
            const increaseBtn = document.querySelector('[data-quantity-increase]');
            
            if (decreaseBtn && increaseBtn && quantityInput) {
              decreaseBtn.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value) || 1;
                quantityInput.value = Math.max(1, currentValue - 1);
              });
              
              increaseBtn.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value) || 1;
                quantityInput.value = currentValue + 1;
              });
            }
            
            // Add to Cart handler
            const addToCartBtn = document.querySelector('[data-add-to-cart]');
            if (addToCartBtn && quantityInput) {
              addToCartBtn.addEventListener('click', function() {
                const qty = quantityInput.value;
                const productName = '${productName || 'Product'}';
                alert('Added ' + qty + ' x ' + productName + ' to cart!');
              });
            }
            
            // Buy Now handler
            const buyNowBtn = document.querySelector('[data-buy-now]');
            if (buyNowBtn && quantityInput) {
              buyNowBtn.addEventListener('click', function() {
                const qty = quantityInput.value;
                const productName = '${productName || 'Product'}';
                alert('Proceeding to checkout with ' + qty + ' x ' + productName);
              });
            }
            
            // Wishlist toggle handler
            const wishlistBtn = document.getElementById('wishlist-btn');
            if (wishlistBtn) {
              wishlistBtn.addEventListener('click', function() {
                const svg = wishlistBtn.querySelector('svg');
                const isActive = wishlistBtn.classList.contains('wishlist-active');
                
                if (isActive) {
                  wishlistBtn.classList.remove('wishlist-active', 'bg-red-50', 'border-red-300');
                  wishlistBtn.classList.add('hover:bg-gray-50');
                  svg.classList.remove('text-red-500', 'fill-current');
                  svg.classList.add('text-gray-600');
                  svg.setAttribute('fill', 'none');
                } else {
                  wishlistBtn.classList.add('wishlist-active', 'bg-red-50', 'border-red-300');
                  wishlistBtn.classList.remove('hover:bg-gray-50');
                  svg.classList.add('text-red-500', 'fill-current');
                  svg.classList.remove('text-gray-600');
                  svg.setAttribute('fill', 'currentColor');
                }
              });
            }
            
            // Share button handler
            const shareBtn = document.querySelector('[data-share]');
            if (shareBtn) {
              shareBtn.addEventListener('click', function() {
                const productUrl = window.location.href;
                const productName = '${productName || 'Product'}';
                const price = '${price || '0.00'}';
                const subject = 'Check out ' + productName;
                const body = 'I thought you might be interested in this product:\\n\\n' + productName + '\\nPrice: $' + price + '\\n\\n' + productUrl;
                const mailtoLink = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
                window.location.href = mailtoLink;
              });
            }
          }
        })();
      ` }} />
    </div>
  );
}

export const fields = (
  <ModuleFields>
    {/* Product Basic Info */}
    <TextField
      name="productName"
      label="Product Name"
      default="Luminous Pearl Necklace"
      required={true}
    />
    <NumberField
      name="price"
      label="Price"
      default={849}
      required={true}
    />
    <NumberField
      name="originalPrice"
      label="Original Price (optional)"
      helpText="Show strikethrough price for sales"
    />
    <NumberField
      name="rating"
      label="Rating"
      default={5}
      min={0}
      max={5}
      step={0.1}
    />
    <NumberField
      name="reviewCount"
      label="Review Count"
      default={142}
    />
    <TextField
      name="badge"
      label="Badge Text"
      default="Best Seller"
      helpText="e.g., 'Best Seller', 'New Arrival', 'Sale'"
    />
    <TextField
      name="stockStatus"
      label="Stock Status"
      default="In Stock"
    />
    <TextField
      name="description"
      label="Short Description"
      default="Handcrafted with 18k gold and lustrous freshwater pearls, this necklace is a timeless piece that adds elegance to any outfit. Each pearl is carefully selected for its perfect shape and radiant glow."
    />

    {/* Images */}
    <ImageField
      name="mainImage"
      label="Main Product Image"
      resizable={true}
      required={true}
    />
    <ImageField
      name="gallery1"
      label="Gallery Image 2"
      resizable={true}
    />
    <ImageField
      name="gallery2"
      label="Gallery Image 3"
      resizable={true}
    />
    <ImageField
      name="gallery3"
      label="Gallery Image 4"
      resizable={true}
    />

    {/* Trust Badges */}
    <BooleanField
      name="hasShipping"
      label="Show Free Shipping Badge"
      default={true}
    />
    <TextField
      name="shippingText"
      label="Shipping Badge Text"
      default="Free Shipping"
    />
    <BooleanField
      name="hasWarranty"
      label="Show Warranty Badge"
      default={true}
    />
    <TextField
      name="warrantyText"
      label="Warranty Badge Text"
      default="1 Year Warranty"
    />
    <BooleanField
      name="hasReturns"
      label="Show Returns Badge"
      default={true}
    />
    <TextField
      name="returnsText"
      label="Returns Badge Text"
      default="30-Day Returns"
    />

    {/* Description Tab Content */}
    <RichTextField
      name="descriptionTab"
      label="Full Description"
      default="<p>The Luminous Pearl Necklace is a masterpiece of artisan jewelry, meticulously handcrafted by our skilled jewelers. Each piece features carefully selected freshwater pearls that have been ethically sourced and matched for their exceptional quality, luster, and uniformity.</p><p>The 18k gold chain is crafted using traditional techniques, ensuring durability while maintaining the delicate aesthetic that makes this piece truly special. The closure features our signature clasp design, making it easy to wear while ensuring security.</p>"
    />
    <RichTextField
      name="features"
      label="Features List"
      default="<ul><li>Handcrafted 18k gold chain</li><li>AAA-grade freshwater pearls</li><li>Secure lobster clasp closure</li><li>Hypoallergenic materials</li><li>Comes with certificate of authenticity</li></ul>"
    />
    <RichTextField
      name="careInstructions"
      label="Care Instructions"
      default="<ul><li>Store in provided jewelry box</li><li>Clean with soft, damp cloth</li><li>Avoid contact with chemicals</li><li>Remove before bathing or swimming</li></ul>"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Product Detail',
  description: 'Full product detail page with gallery, quantity selector, and interactive buttons',
  icon: 'shopping-bag',
  categories: ['ecommerce', 'product'],
};
