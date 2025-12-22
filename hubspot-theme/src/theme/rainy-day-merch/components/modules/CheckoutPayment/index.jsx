import { Island } from '@hubspot/cms-components';
import { ModuleFields, TextField } from '@hubspot/cms-components/fields';
import CheckoutPaymentIsland from '../../islands/CheckoutPaymentIsland.jsx?island';

export function Component({ squareApplicationId, squareLocationId }) {
  return (
    <div>
      <Island 
        module={CheckoutPaymentIsland} 
        squareApplicationId={squareApplicationId}
        squareLocationId={squareLocationId}
      />
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      label="Square Application ID"
      name="squareApplicationId"
      default="sandbox-sq0idb-xxxxxxxxxxxx"
    />
    <TextField
      label="Square Location ID"
      name="squareLocationId"
      default="LXXXXXXXXXXXX"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Checkout - Payment',
  description: 'Payment form for checkout process',
  icon: 'credit-card',
};

