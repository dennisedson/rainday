import {
  ModuleFields,
  TextField,
  ImageField,
  BooleanField,
} from '@hubspot/cms-components/fields';

export function Component({ fieldValues }) {
  const {
    badgeText,
    showBadge,
    title,
    description,
    stat1Value,
    stat1Label,
    stat2Value,
    stat2Label,
    ctaText,
    ctaUrl,
    showCta,
    image,
  } = fieldValues;
  
  // Use badge text or default company name
  const displayBadgeText = badgeText || 'RAINY DAY MERCHANDISE';

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            {showBadge && (
              <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold uppercase rounded mb-6">
                {displayBadgeText}
              </div>
            )}

            {/* Title */}
            {title && (
              <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {title}
              </h2>
            )}

            {/* Description */}
            {description && (
              <div className="text-gray-600 leading-relaxed mb-8 space-y-4">
                {description}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Stat 1 */}
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat1Value || '100%'}
                </div>
                <p className="text-gray-600 text-sm">
                  {stat1Label || 'Handmade, No Machine'}
                </p>
              </div>

              {/* Stat 2 */}
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat2Value || '14 Years'}
                </div>
                <p className="text-gray-600 text-sm">
                  {stat2Label || 'Of Experience'}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            {showCta && ctaText && (
              <a
                href={ctaUrl || '#'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span>{ctaText}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </div>

          {/* Right Image */}
          <div className="relative lg:h-[600px]">
            {image?.src ? (
              <img
                src={image.src}
                alt={image.alt || title}
                className="w-full h-full object-cover rounded-2xl shadow-xl"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-2xl flex items-center justify-center">
                <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const fields = (
  <ModuleFields>
    <BooleanField
      name="showBadge"
      label="Show Badge"
      default={true}
    />
    <TextField
      name="badgeText"
      label="Badge Text"
      default="RAINY DAY MERCHANDISE"
      helpText="Text for the badge (typically your company name)"
    />
    <TextField
      name="title"
      label="Section Title"
      default="Crafted with Passion, Made to Last"
      required={true}
      helpText="Main heading for the section"
    />
    <TextField
      name="description"
      label="Description"
      default="Since 2010, Artisan & Co. has been dedicated to creating beautiful, timeless pieces that celebrate the art of handcrafted jewelry and artisan crafts. Each piece you purchase from us, you're not just buying a product -- you're investing in a story and legacy."
      helpText="Long description text"
    />
    <TextField
      name="stat1Value"
      label="Stat 1 Value"
      default="100%"
      helpText="First statistic value (e.g., '100%')"
    />
    <TextField
      name="stat1Label"
      label="Stat 1 Label"
      default="Handmade, No Machine"
      helpText="First statistic label"
    />
    <TextField
      name="stat2Value"
      label="Stat 2 Value"
      default="14 Years"
      helpText="Second statistic value (e.g., '14 Years')"
    />
    <TextField
      name="stat2Label"
      label="Stat 2 Label"
      default="Of Experience"
      helpText="Second statistic label"
    />
    <BooleanField
      name="showCta"
      label="Show Call-to-Action Button"
      default={true}
    />
    <TextField
      name="ctaText"
      label="CTA Button Text"
      default="Learn More About Us"
      helpText="Text for the call-to-action button"
    />
    <TextField
      name="ctaUrl"
      label="CTA Button URL"
      default="/about"
      helpText="Link URL for the button"
    />
    <ImageField
      name="image"
      label="Featured Image"
      resizable={true}
      helpText="Large image for the right side (recommended: 800x1000px)"
    />
  </ModuleFields>
);

export const meta = {
  label: 'About Story',
  description: 'About section with story, stats, and call-to-action',
  icon: 'heart',
  categories: ['content', 'about'],
};

