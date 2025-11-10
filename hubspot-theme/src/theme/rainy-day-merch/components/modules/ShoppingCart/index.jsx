import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import ShoppingCartIsland from '../../islands/ShoppingCartIsland.jsx?island';

export function Component() {
  return (
    <div>
      <Island module={ShoppingCartIsland} />
    </div>
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Shopping Cart',
  description: 'Shopping cart with item management and checkout flow',
  icon: 'shopping-cart',
};

