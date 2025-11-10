import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import CheckoutShippingIsland from '../../islands/CheckoutShippingIsland.jsx?island';

export function Component() {
  return (
    <div>
      <Island module={CheckoutShippingIsland} />
    </div>
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Checkout - Shipping',
  description: 'Shipping information form for checkout process',
  icon: 'truck',
};

