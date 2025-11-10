import { Island } from '@hubspot/cms-components';
import {
  ModuleFields,
  TextField,
} from '@hubspot/cms-components/fields';
import NewsletterIsland from '../../islands/NewsletterIsland.jsx?island';

export function Component({ fieldValues }) {
  const { title, subtitle, placeholderText, buttonText } = fieldValues;

  return (
    <Island
      module={NewsletterIsland}
      title={title}
      subtitle={subtitle}
      placeholderText={placeholderText}
      buttonText={buttonText}
    />
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="title"
      label="Newsletter Title"
      default="Join Our Community"
      helpText="Main heading for the newsletter section"
    />
    <TextField
      name="subtitle"
      label="Newsletter Subtitle"
      default="Subscribe to receive updates and sales information on new releases, discounts, and offers directly delivered to your inbox."
      helpText="Description text below the title"
    />
    <TextField
      name="placeholderText"
      label="Email Placeholder Text"
      default="Enter your email"
      helpText="Placeholder text for the email input field"
    />
    <TextField
      name="buttonText"
      label="Button Text"
      default="Subscribe"
      helpText="Text for the subscribe button"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Newsletter Signup',
  description: 'Newsletter subscription section with email input',
  icon: 'mail',
  categories: ['forms', 'newsletter'],
};

