# Future Features - Marketing Email with Favorites

## TODO: Personalized Marketing Email with Favorites

**Feature:** Send marketing emails to HubSpot contacts featuring their favorited products.

### Implementation Plan

**Backend (Vercel API):**
- Create endpoint: `/api/send-favorites-email`
- Fetch contact's favorites from HubSpot (`favorite_products` property)
- Fetch product details from Square API
- Generate email HTML with favorited products
- Send via HubSpot Marketing Email API or transactional email service

**HubSpot Integration:**
- Use HubSpot Marketing Email API or Workflows
- Create email template with dynamic product blocks
- Trigger via:
  - Manual send from HubSpot
  - Automated workflow (e.g., "Contact has favorites + hasn't purchased")
  - Scheduled campaign

**Email Content:**
- Personalized greeting
- "You might like these products" section
- Grid of favorited products with:
  - Product images
  - Product names
  - Prices
  - "Shop Now" CTAs
- "View All Favorites" button
- Unsubscribe link

### Technical Considerations

**Data Flow:**
1. Contact clicks "Send me my favorites" or automated trigger
2. API fetches favorites from HubSpot contact property
3. API fetches product details from Square
4. Generate personalized email HTML
5. Send via HubSpot Marketing API or transactional service

**HubSpot Marketing Email API:**
- Use `marketing.transactional` API for transactional emails
- Or use Marketing Email API for campaign emails
- Requires additional scopes: `marketing.transactional.send`

**Alternative: HubSpot Workflows**
- Create workflow that triggers on contact property update
- Use "Send marketing email" action
- Use personalization tokens to include favorites

### Required Scopes
- `marketing.transactional.send` (for transactional emails)
- OR `marketing.email.send` (for marketing emails)
- `crm.objects.contacts.read` (already have)
- `crm.objects.contacts.write` (already have)

### Example Email Structure
```
Subject: Your Favorite Products from Rainy Day Merchandise

Hi [Contact Name],

We noticed you've been eyeing some of our products! Here are your favorites:

[Product Grid with 3-6 favorited products]

[View All Favorites Button]

Happy Shopping!
Rainy Day Merchandise Team
```

### Future Enhancements
- A/B test different email templates
- Include "Recently Viewed" products
- Add "Complete Your Look" suggestions
- Track email open/click rates
- Personalize send times based on contact behavior

