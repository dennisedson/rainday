import {
  ModuleFields,
  TextField,
  RichTextField,
  ImageField,
} from '@hubspot/cms-components/fields';

export function Component({ fieldValues }) {
  const { title, subtitle, image, showBadge, badgeText, feature1, feature2, feature3, showCta, ctaText, ctaUrl } = fieldValues;

  return (
    <div className="relative bg-beige py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            {showBadge && (
              <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold uppercase rounded mb-6">
                {badgeText || 'Sale'}
              </div>
            )}

            {/* Title */}
            {title && (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
                {title}
              </h1>
            )}

            {/* Description */}
            {subtitle && (
              <p className="text-base text-gray-600 mb-6 leading-relaxed max-w-lg">
                {subtitle}
              </p>
            )}

            {/* CTA Button */}
            {showCta && ctaText && (
              <div className="mb-8">
                <a
                  href={ctaUrl || '#'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <span>{ctaText}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            )}

                {/* Features */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Feature 1 - Handcrafted */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{feature1 || 'Handcrafted'}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-10">With precision</p>
                  </div>

                  {/* Feature 2 - Premium Materials */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{feature2 || 'Premium Materials'}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-10">Ethically sourced</p>
                  </div>

                  {/* Feature 3 - Gift Ready */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                          <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{feature3 || 'Gift Ready'}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-10">Luxury packaging</p>
                  </div>
                </div>
          </div>

          {/* Right Image */}
          <div className="relative lg:h-[500px]">
            <img
              src={image?.src || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=600&fit=crop&q=80'}
              alt={image?.alt || title || 'Jewelry collection'}
              className="w-full h-full object-cover rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="title"
      label="Hero Title"
      default="Necklaces"
      required={true}
      helpText="Main heading for the hero section"
    />
    <RichTextField
      name="subtitle"
      label="Description"
      default="Discover our curated collection of handcrafted necklaces. From delicate chains to statement pieces, each necklace is meticulously designed to elevate your style."
      helpText="Descriptive text below the title"
    />
    <ImageField
      name="image"
      label="Hero Image"
      resizable={true}
      helpText="Large product/lifestyle image (recommended: 800x600px)"
    />
    <TextField
      name="showBadge"
      label="Show Badge"
      default="true"
      helpText="Show the SALE badge (true/false)"
    />
    <TextField
      name="badgeText"
      label="Badge Text"
      default="SALE"
      helpText="Text to display in the badge"
    />
    <TextField
      name="feature1"
      label="Feature 1 Title"
      default="Handcrafted"
      helpText="First feature label"
    />
    <TextField
      name="feature2"
      label="Feature 2 Title"
      default="Premium Materials"
      helpText="Second feature label"
    />
    <TextField
      name="feature3"
      label="Feature 3 Title"
      default="Gift Ready"
      helpText="Third feature label"
    />
    <TextField
      name="showCta"
      label="Show CTA Button"
      default="false"
      helpText="Show call-to-action button (true/false)"
    />
    <TextField
      name="ctaText"
      label="CTA Button Text"
      default="Shop Now"
      helpText="Text for the call-to-action button"
    />
    <TextField
      name="ctaUrl"
      label="CTA Button URL"
      default="/shop"
      helpText="Link URL for the button"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Hero Section',
  description: 'A hero banner with title, subtitle, and image',
  icon: 'image',
};

