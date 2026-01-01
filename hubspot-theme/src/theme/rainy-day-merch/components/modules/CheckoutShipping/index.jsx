import { Island } from '@hubspot/cms-components';
import { ModuleFields, TextField, ChoiceField } from '@hubspot/cms-components/fields';
import CheckoutShippingIsland from '../../islands/CheckoutShippingIsland.jsx?island';

export function Component({ fieldValues }) {
  const { environment, sandboxAppId, sandboxLocId, productionAppId, productionLocId } = fieldValues;
  
  // Select the appropriate IDs based on the environment toggle
  const appId = environment === 'production' ? productionAppId : sandboxAppId;
  const locId = environment === 'production' ? productionLocId : sandboxLocId;

  return (
    <div>
      <Island 
        module={CheckoutShippingIsland} 
        squareApplicationId={appId}
        squareLocationId={locId}
      />
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <ChoiceField
      label="Square Environment"
      name="environment"
      default="sandbox"
      choices={[
        ['sandbox', 'Sandbox'],
        ['production', 'Production'],
      ]}
      display="radio"
      helpText="Toggle between Sandbox (testing) and Production (live) modes"
    />
    
    <TextField
      label="Sandbox Application ID"
      name="sandboxAppId"
      default="sandbox-sq0idb-vzMCT08FEX4vNU_c0Yri6w"
      helpText="Starts with 'sandbox-sq0idb-'"
      visibility={{
        controllingFieldName: 'environment',
        controllingFieldValue: 'sandbox',
      }}
    />
    <TextField
      label="Sandbox Location ID"
      name="sandboxLocId"
      default="L63B6R6N6VHHM"
      visibility={{
        controllingFieldName: 'environment',
        controllingFieldValue: 'sandbox',
      }}
    />
    
    <TextField
      label="Production Application ID"
      name="productionAppId"
      default="sq0idp-JxeW0Ff9fzObldQDlpzhRQ"
      helpText="Starts with 'sq0idp-'"
      visibility={{
        controllingFieldName: 'environment',
        controllingFieldValue: 'production',
      }}
    />
    <TextField
      label="Production Location ID"
      name="productionLocId"
      default="LW249CNFMBBA0"
      visibility={{
        controllingFieldName: 'environment',
        controllingFieldValue: 'production',
      }}
    />
  </ModuleFields>
);

export const meta = {
  label: 'Checkout - Shipping',
  description: 'Shipping information form for checkout process',
  icon: 'truck',
};

