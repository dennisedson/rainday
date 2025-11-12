import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import AccountIsland from '../../islands/AccountIsland.jsx?island';

export function Component() {
  return (
    <Island module={AccountIsland} />
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Account Page',
  description: 'User account page with favorites and order history',
  icon: 'user',
  categories: ['user-account'],
};

