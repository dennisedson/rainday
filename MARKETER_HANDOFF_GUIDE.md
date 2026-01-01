# Marketer Handoff Guide (Rainy Day Merchandise)

This guide is for day-to-day site management **without touching code**: updating copy, swapping images, featuring products, managing inventory, and sending emails/campaigns.

If you ever feel unsure, the safe rule is:
- **Edit content in HubSpot** (pages + modules) ✅
- **Manage products/inventory in Square** ✅
- **Anything involving “code”, “Vercel”, “API”, “tokens”, or “deploys” → escalate to the site owner/developer** ✅

---

## How the site works (1 minute mental model)

- **HubSpot CMS**: hosts the site pages + the editable “sections” (modules) like Hero, About, Testimonials, Category Banner, etc.
- **Square**: is the source of truth for products (name, price, description, images), categories, and inventory.
- **Vercel API**: a small backend the site calls to fetch products/categories from Square and to process payments.

What that means for you:
- Changing a **product** happens in **Square**.
- Changing **homepage/shop page text and images** usually happens in **HubSpot page editor**.

---

## Access you’ll likely need (ask the owner for logins)

- **HubSpot**: to edit pages, modules, emails, lists, workflows.
- **Square Dashboard**: to manage products, pricing, images, inventory, categories.
- (Optional / view-only) **Vercel**: to view API logs if something breaks during checkout.

---

## Daily / weekly tasks

## Update Global Settings (Square & Theme)

To keep things simple, we use **Global Theme Settings** for the major stuff like your Square account IDs and test modes. You only have to set these **once** for the whole site.

- Go to **Marketing → Website → Website pages**
- Click **Edit** on any page (like Home)
- In the top menu, click the **Design** tab (gear icon)
- Click **Edit theme settings**
- Find the **Square Integration Settings** group:
  - **Square Environment**: Toggle between **Sandbox (Testing)** and **Production (Live)**.
  - **IDs**: Your Sandbox and Production Application/Location IDs are stored here.

---

## Update homepage content (HubSpot)

The homepage is built from editable “modules”. In HubSpot:
- Go to **Marketing → Website → Website pages**
- Find the homepage (usually named something like “Home”)
- Click **Edit**

Common homepage modules you can edit:
- **Hero Section**
  - Update: headline, description, hero image, badge text, CTA text/link
- **Category Grid**
  - Update: up to 4 category cards (image, label, link)
- **Trending Products**
  - Update: title/subtitle, “View All” link
  - Optional: pick specific products by entering their **Square Product IDs** (more on this below)
- **About Story**
  - Update: badge, title, description, stats, CTA, image
- **Testimonials**
  - Update: title/subtitle and up to 3 testimonials
- **Newsletter Signup**
  - Update: title/subtitle/placeholder/button label (see “Newsletter note” below)
- **Product Detail** (on individual product pages)
  - Update: Trust Badges (e.g., “Free Shipping”, “1 Year Warranty”, “30-Day Returns”) and toggle their visibility.

When you’re done:
- Click **Publish** (or schedule) in HubSpot.

---

## Update the Shop page banner (HubSpot) — category text + images

The Shop page has a **Category Banner** at the top that changes based on the selected category (via URL).

To update banner copy/images per category:
- In HubSpot, edit the **Shop** page
- Click the **Category Banner** module
- Find **Category Custom Content**
- Add an entry for each category you want to customize:
  - **Category Name**: must match the Square category name exactly (example: `Bracelets`)
  - **Custom Description**: your banner text
  - **Custom Banner Image (Optional)**: upload an image if you want to override the Square category image

Notes:
- If there’s no override, the banner tries to use **Square’s category description/image** (if provided), otherwise it falls back to the site defaults.

---

## Feature specific products in “Trending” (HubSpot + Square Product IDs)

Trending Products can be random, or you can pin specific products using their Square Product IDs.

To pin products:
- In HubSpot, edit the page with the **Trending Products** module (usually Home)
- In the module settings, look for **Specific Products (Optional)** and add product IDs

Where to find a Square Product ID:
- Ask the owner/dev to show you once (fastest)
- Or in Square Catalog, the item will have an internal ID (exact location depends on Square UI)

If you don’t set any product IDs, the site shows a random selection.

---

## Manage products, pricing, inventory, images (Square)

Square is the source of truth. Typical workflow:

- **Add / update a product**
  - Update product **name**
  - Update **price**
  - Update **description**
  - Add strong **images**
  - Ensure it’s **available online** (otherwise it may not show on the site)

- **Inventory**
  - **Automatic Tracking**: The site is now configured to officially **Create Orders** in Square. When a customer completes a purchase, Square will automatically decrease your inventory.
  - **Out of Stock**: If a product's inventory hits zero (or if you turn off "Available Online"), the site will automatically:
    - Display an **"Out of Stock"** badge on the product grid and product pages.
    - **Disable** the "Add to Cart" and "Buy Now" buttons.
  - **Manual Edits**: You can manually adjust stock levels in Square anytime, and the site will update instantly.

- **Categories**
  - Assign products to the right Square category
  - If you add a new category, also:
    - Add it to the homepage **Category Grid** (so shoppers can find it)
    - Add a **Category Banner override** on the Shop page if you want custom copy

- **Shipping & Tax**
  - Taxes and shipping are calculated automatically by Square.
  - **If you see $0.00**: ensure you have configured your **Tax Rules** and **Shipping Rates** (as Service Charges) in your Square Dashboard under Settings.
  - **Debugging Taxes**: 
    - Open your browser's Developer Console (Right-click anywhere on the page -> Inspect -> Console).
    - When you enter your Zip Code on the Shipping page, you will see a message like: `[Shipping] Tax Applied: Sales Tax (8.875%) - $0.80`.
    - If you see `[Shipping] Square Error Details`, look for the "detail" message. This tells you exactly why Square rejected the calculation.
    - If you see `[Shipping] No taxes returned from Square`, double-check that your items in Square have the "Taxes" toggle turned **ON**.

- **Shopping Cart**
  - Cart count in the navigation badge updates automatically when items are added, removed, or quantities are changed.

  - The site pulls exactly what Square returns for the customer's location.

---

## Emails (HubSpot) — what you manage vs what you don’t

## Marketing emails (you manage)
Use HubSpot’s marketing tools for campaigns:
- **Marketing → Email**
- **Lists** and **Workflows** as needed

## Magic-link login emails (usually not you)
The site supports passwordless login (“magic links”). Those emails are **transactional** and require backend configuration (tokens + an email provider).

If customers report “I never got the login email”, escalate to the owner/dev.

## Newsletter signup note (important)
The on-site Newsletter form UI is present, but the current implementation is a **placeholder** (it simulates success and does not actually add contacts anywhere).

If you want newsletter signups to go into HubSpot automatically, ask the owner/dev to:
- Replace the newsletter module with a native **HubSpot Form**, or
- Wire the form to a real subscription endpoint / HubSpot Forms API.

---

## Common “how do I…”

## “I want a category tile on the homepage to link to a category”
Edit the **Category Grid** module and set the link like:
- `/shop?category=Bracelets`

Tip: use the **exact category name** as it appears on the site/Square.

## “I want to update the big banner text for Bracelets”
Edit the **Shop** page → **Category Banner** module → add/update the `Bracelets` override.

## “I want to run a sale”
Best low-risk approach:
- Change **prices** in Square (and optionally the banner copy in HubSpot)

If you want promo codes / more advanced discounting:
- That may require development depending on how it’s set up.

---

## Troubleshooting (quick checks)

## Products not showing up
- Check in **Square**:
  - Product is **available online**
  - Product has a **price**
  - Product is not archived/deleted
  - Product has at least one image (site falls back to a placeholder, but images are better)

## Category banner image looks wrong
- If you uploaded a custom image in HubSpot override, confirm you picked the right override category name.
- Otherwise check the Square category image (if one is set).

## Checkout/payment failing
- Try again with a different card (could be issuer decline)
- If it’s consistent for everyone, escalate to owner/dev and share:
  - The time it happened
  - What page/step
  - Any error message shown

---

## What requires a developer (don’t spend time fighting it)

- Connecting newsletter signup to HubSpot lists
- Changing how checkout/tax/shipping is calculated
- Adding new product categories that must appear in hardcoded dropdowns
- Changing domain, SSL, API URLs, environment variables
- Anything that mentions: Vercel, API, tokens, `.env`, deploys, “hs project upload”

---

## Developer & Testing Environments

To keep the live site safe, we use two separate "worlds":

1.  **The Production World (Branch: `mom`)**:
    *   This is the real site that customers see.
    *   Linked to your **Main HubSpot Portal** and **Square Production**.
2.  **The Testing World (Branch: `dev`)**:
    *   This is a "sandbox" for testing new changes.
    *   Linked to your **HubSpot Developer Test Account** and **Square Sandbox**.

**Workflow for new changes:**
*   Changes are first pushed to the `dev` branch.
*   We test them on the **Developer Test Site**.
*   Once everything is perfect, we merge them into `mom`, and they go live on the real site.

---

## Handoff checklist (for your walkthrough)

- Confirm she can log into **HubSpot** and publish a small copy change
- Confirm she can log into **Square** and edit a product price
- Show her:
  - Editing homepage modules
  - Editing Shop banner overrides
  - Finding and updating category links (`/shop?category=...`)
- Agree on an escalation path for:
  - Checkout issues
  - Login/magic link issues
  - Newsletter capture needs


