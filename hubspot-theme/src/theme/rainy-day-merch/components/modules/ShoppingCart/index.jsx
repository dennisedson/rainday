import { Island } from '@hubspot/cms-components';
import { ModuleFields, TextField, ChoiceField } from '@hubspot/cms-components/fields';
import ShoppingCartIsland from '../../islands/ShoppingCartIsland.jsx?island';

export function Component({ fieldValues, themeSettings }) {
  // Pull from Theme Settings by default, fallback to local module settings
  const themeSquare = themeSettings?.square_settings || {};
  
  const environment = fieldValues.environment || themeSquare.environment || 'sandbox';
  
  // Sandbox IDs
  const sandboxAppId = fieldValues.sandboxAppId || themeSquare.sandbox_application_id || 'sandbox-sq0idb-vzMCT08FEX4vNU_c0Yri6w';
  const sandboxLocId = fieldValues.sandboxLocId || themeSquare.sandbox_location_id || 'L63B6R6N6VHHM';
  
  // Production IDs
  const productionAppId = fieldValues.productionAppId || themeSquare.production_application_id || 'sq0idp-JxeW0Ff9fzObldQDlpzhRQ';
  const productionLocId = fieldValues.productionLocId || themeSquare.production_location_id || 'LW249CNFMBBA0';
  
  // Select active IDs
  const appId = environment === 'production' ? productionAppId : sandboxAppId;
  const locId = environment === 'production' ? productionLocId : sandboxLocId;

  return (
    <div>
      <Island 
        module={ShoppingCartIsland} 
        squareApplicationId={appId}
        squareLocationId={locId}
      />
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <ChoiceField
      label="Square Environment Override"
      name="environment"
      choices={[
        ['', 'Use Theme Default'],
        ['sandbox', 'Force Sandbox'],
        ['production', 'Force Production'],
      ]}
      default=""
      display="radio"
      helpText="Override the global Theme setting for this specific page if needed."
    />
    
    <TextField
      label="Override Sandbox Application ID"
      name="sandboxAppId"
      default=""
      helpText="Leave empty to use Theme default"
    />
    <TextField
      label="Override Sandbox Location ID"
      name="sandboxLocId"
      default=""
    />
    
    <TextField
      label="Override Production Application ID"
      name="productionAppId"
      default=""
    />
    <TextField
      label="Override Production Location ID"
      name="productionLocId"
      default=""
    />
  </ModuleFields>
);

export const meta = {
  label: 'Shopping Cart',
  description: 'Shopping cart with item management and checkout flow',
  icon: 'shopping-cart',
};

