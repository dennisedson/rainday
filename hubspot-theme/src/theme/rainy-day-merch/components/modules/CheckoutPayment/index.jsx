import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import CheckoutPaymentIsland from '../../islands/CheckoutPaymentIsland.jsx?island';

export function Component() {
  return (
    <div>
      <Island module={CheckoutPaymentIsland} />
    </div>
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Checkout - Payment',
  description: 'Payment form for checkout process',
  icon: 'credit-card',
};

