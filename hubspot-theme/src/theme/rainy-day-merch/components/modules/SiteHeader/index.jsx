import { ModuleFields, TextField, ImageField } from '@hubspot/cms-components/fields';

export function Component({ fieldValues, hublData }) {
  const { siteName, logoText, logoImage } = fieldValues;
  
  // Prioritize: HubSpot settings → Module fields → Defaults
  const displayName = hublData?.companyName || siteName || 'Rainy Day Merchandise';
  const displayLogo = logoText || (hublData?.companyName ? hublData.companyName.charAt(0).toUpperCase() : 'R');
  const displayLogoImage = hublData?.companyLogo || logoImage?.src || null;

  const navigationItems = [
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Jewelry', href: '/jewelry' },
    { label: 'Crafts', href: '/crafts' },
    { label: 'Collections', href: '/collections' },
    { label: 'About', href: '/about' },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            {displayLogoImage ? (
              <img 
                src={displayLogoImage} 
                alt={displayName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{displayLogo}</span>
              </div>
            )}
            <span className="text-xl font-display font-semibold text-gray-900">
              {displayName}
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <a
              href="/cart"
              className="relative p-2 text-gray-600 hover:text-primary transition-colors duration-200"
              aria-label="Cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="siteName"
      label="Site Name (Override)"
      helpText="Optional: Override HubSpot company name"
    />
    <ImageField
      name="logoImage"
      label="Logo Image (Override)"
      helpText="Optional: Override HubSpot logo. Recommended size: 150x150px"
      resizable={true}
    />
    <TextField
      name="logoText"
      label="Logo Letter (Fallback)"
      default="R"
      helpText="Letter shown if no logo image is provided"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Site Header',
  description: 'Main navigation header with logo, menu, search, and cart',
  icon: 'menu',
};

// Fetch company settings from HubSpot using correct variables
export const hublDataTemplate = `
  {% set hublData = {
    "companyName": site_settings.company_name|default(""),
    "companyLogo": brand_settings.primary_logo.src|default(""),
    "companyLogoAlt": brand_settings.primary_logo.alt|default(""),
    "siteName": site_settings.company_name|default("")
  } %}
`;

