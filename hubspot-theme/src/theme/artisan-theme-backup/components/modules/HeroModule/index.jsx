import { ModuleFields, TextField, RichTextField, ImageField, FieldGroup, BooleanField } from '@hubspot/cms-components/fields';

/**
 * Hero Module - Editable in HubSpot CMS
 * All content (text, images, buttons, stats) can be edited in the page editor
 */

export function Component({ fieldValues }) {
  const {
    badgeText,
    title,
    subtitle,
    primaryCtaText,
    primaryCtaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    heroImage,
    showStats,
    stat1Value,
    stat1Label,
    stat2Value,
    stat2Label,
    stat3Value,
    stat3Label,
    showPriceTag,
    priceTagText,
    priceTagAmount,
  } = fieldValues;

  const stats = [
    { value: stat1Value, label: stat1Label },
    { value: stat2Value, label: stat2Label },
    { value: stat3Value, label: stat3Label },
  ].filter(stat => stat.value && stat.label);

  return (
    <section className="relative bg-beige overflow-hidden py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            {badgeText && (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-base font-semibold bg-yellow-400 text-yellow-900">
                {badgeText}
              </span>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight">
              {title}
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              {subtitle}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              {primaryCtaText && primaryCtaUrl && (
                <a
                  href={primaryCtaUrl}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg border border-transparent font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-white hover:bg-primary-600 focus:ring-primary-500 shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#FF6B35' }}
                >
                  {primaryCtaText}
                </a>
              )}
              
              {secondaryCtaText && secondaryCtaUrl && (
                <a
                  href={secondaryCtaUrl}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg bg-transparent border-2 border-gray-300 font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
            
            {/* Stats */}
            {showStats && stats.length > 0 && (
              <div className="flex flex-wrap gap-8 pt-8 border-t border-gray-200">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center sm:text-left">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Right Column - Product Image */}
          <div className="relative">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
              {heroImage?.src ? (
                <img
                  src={heroImage.src}
                  alt={heroImage.alt || title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-gray-800">
                  <div className="text-center text-white/80">
                    <p className="text-2xl font-display">Featured Product</p>
                  </div>
                </div>
              )}
              
              {/* Price Tag Overlay */}
              {showPriceTag && (
                <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg px-6 py-4">
                  <p className="text-sm text-gray-600">{priceTagText}</p>
                  <p className="text-3xl font-bold" style={{ color: '#FF6B35' }}>{priceTagAmount}</p>
                </div>
              )}
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -z-10 top-10 -right-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }} />
            <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(250, 204, 21, 0.1)' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      label="Badge Text"
      name="badgeText"
      default="Featured Collection"
      helpText="Small badge text displayed above the title"
    />
    
    <TextField
      label="Title"
      name="title"
      default="Ethereal Gold Collection"
      required={true}
      helpText="Main hero title"
    />
    
    <RichTextField
      label="Subtitle"
      name="subtitle"
      default="Discover our meticulously crafted luxury jewelry pieces, handcrafted designed with 18k gold and ethically sourced gemstones. Each piece tells a unique story."
      helpText="Hero description text"
    />

    <FieldGroup name="cta_buttons" label="Call to Action Buttons">
      <TextField
        label="Primary Button Text"
        name="primaryCtaText"
        default="Shop Collection"
      />
      <TextField
        label="Primary Button URL"
        name="primaryCtaUrl"
        default="/products"
      />
      <TextField
        label="Secondary Button Text"
        name="secondaryCtaText"
        default="Learn More"
      />
      <TextField
        label="Secondary Button URL"
        name="secondaryCtaUrl"
        default="/about"
      />
    </FieldGroup>

    <ImageField
      label="Hero Image"
      name="heroImage"
      helpText="Main hero image (recommended: 800x800px)"
      resizable={true}
    />

    <FieldGroup name="price_tag" label="Price Tag Overlay">
      <BooleanField
        label="Show Price Tag"
        name="showPriceTag"
        default={true}
      />
      <TextField
        label="Price Tag Label"
        name="priceTagText"
        default="Starting at"
      />
      <TextField
        label="Price Amount"
        name="priceTagAmount"
        default="$849"
      />
    </FieldGroup>

    <FieldGroup name="stats_section" label="Statistics">
      <BooleanField
        label="Show Statistics"
        name="showStats"
        default={true}
      />
      <TextField
        label="Stat 1 Value"
        name="stat1Value"
        default="500+"
      />
      <TextField
        label="Stat 1 Label"
        name="stat1Label"
        default="Unique Pieces"
      />
      <TextField
        label="Stat 2 Value"
        name="stat2Value"
        default="98%"
      />
      <TextField
        label="Stat 2 Label"
        name="stat2Label"
        default="Happy Customers"
      />
      <TextField
        label="Stat 3 Value"
        name="stat3Value"
        default="Handmade"
      />
      <TextField
        label="Stat 3 Label"
        name="stat3Label"
        default="With Care"
      />
    </FieldGroup>
  </ModuleFields>
);

export const meta = {
  label: 'Hero Section',
  description: 'Featured collection hero banner with image, text, CTAs, and stats',
  icon: 'star',
  categories: ['content'],
};
