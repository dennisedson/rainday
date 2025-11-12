import { Island } from '@hubspot/cms-components';
import { ModuleFields, TextField, ImageField, BooleanField } from '@hubspot/cms-components/fields';
import SiteHeaderIsland from '../../islands/SiteHeaderIsland.jsx?island';

export function Component({ fieldValues, hublData }) {
  const { siteName, logoImage, showAboutLink, aboutLinkText, aboutLinkUrl } = fieldValues;
  
  // Prioritize: HubSpot settings → Module fields → Defaults
  const displayName = hublData?.companyName || siteName || 'Artisan & Co.';
  const displayLogoImage = hublData?.companyLogo || logoImage?.src || null;

  return (
    <Island 
      module={SiteHeaderIsland}
      siteName={displayName}
      logoImage={displayLogoImage}
      showAboutLink={showAboutLink !== undefined ? showAboutLink : true}
      aboutLinkText={aboutLinkText || 'About'}
      aboutLinkUrl={aboutLinkUrl || '/about'}
    />
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
    <BooleanField
      name="showAboutLink"
      label="Show 'About' Link"
      default={true}
      helpText="Display the About link in the navigation menu"
    />
    <TextField
      name="aboutLinkText"
      label="About Link Text"
      default="About"
      helpText="Text displayed for the About link (only shown if 'Show About Link' is enabled)"
    />
    <TextField
      name="aboutLinkUrl"
      label="About Link URL"
      default="/about"
      helpText="URL for the About link (e.g., '/about' or '/about-us')"
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

