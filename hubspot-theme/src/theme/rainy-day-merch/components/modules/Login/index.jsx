import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import LoginIsland from '../../islands/LoginIsland.jsx?island';

export function Component() {
  return (
    <Island module={LoginIsland} />
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Login Page',
  description: 'Magic link authentication login page',
  icon: 'lock',
  categories: ['authentication', 'user-account'],
};

