import { Island } from '@hubspot/cms-components';
import { ModuleFields } from '@hubspot/cms-components/fields';
import OrderConfirmationIsland from '../../islands/OrderConfirmationIsland.jsx?island';

export function Component() {
  return (
    <div>
      <Island module={OrderConfirmationIsland} />
    </div>
  );
}

export const fields = <ModuleFields />;

export const meta = {
  label: 'Order Confirmation',
  description: 'Order confirmation page with order details',
  icon: 'check-circle',
};

