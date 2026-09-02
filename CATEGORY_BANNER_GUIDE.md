# How to Edit Category Banner Descriptions

Good news: **category banner text/images can be managed in HubSpot** (no code) via the `Category Banner` module.

Code edits are still supported as a fallback, but day-to-day updates should be done in HubSpot.

---

## Option A (Recommended): Edit in HubSpot (No Code)

Open the **Shop** page in the HubSpot page editor and click the **Category
Banner** module.

### The Shop All cover photo

Use the **Shop All Cover Photo** field.

Shop All is the one page that cannot inherit its image from Square, because
"All Products" is not a Square category. That is why it has its own field —
setting a category image in Square will never change this page.

### A specific category’s cover photo

Set the category’s image in **Square** (Items & Orders → Categories). The
banner picks it up automatically, and this is the normal way to change one.

To override Square for a single category, add an entry under **Category Custom
Content**:

- **Category Name** — must match the Square category exactly, e.g. `Bracelets`
- **Custom Description** — banner text
- **Custom Banner Image** — overrides the Square image

### Categories with no image in Square

Use the **Fallback Cover Photo** field. Any category without a Square image
uses it, instead of rendering an empty banner.

Publish the page when you are done.

### What wins, when

1. Custom Banner Image for that category (Category Custom Content)
2. Shop All Cover Photo — Shop All only
3. The category’s image in Square
4. Fallback Cover Photo
5. A built-in default

---

## Option B (Fallback): Edit in Code

Use this if you prefer to keep defaults in code, or if HubSpot access is limited.

### Quick Edit Guide

**File to edit:**
```
hubspot-theme/src/theme/rainy-day-merch/components/islands/CategoryBannerIsland.jsx
```

**Look for this section** (around line 59):

```javascript
const categoryContent = {
  'Bracelets': {
    title: 'Bracelets',
    description: 'YOUR CUSTOM TEXT HERE',
  },
  // ... more categories
};
```

### Steps to Update:

1. **Open the file** in your code editor
2. **Find your category** in the `categoryContent` object
3. **Edit the `description`** field
4. **Save the file**
5. **Run:** `cd hubspot-theme && hs project upload`
6. **Refresh your browser** - changes are live!

### What You Can Edit:

- ✅ **Description text** - The paragraph below the title
- ❌ **Title** - Matches Square category name (auto-generated)
- ❌ **Image** - Comes from Square (edit in Square dashboard)

### Adding New Categories:

When you add a new category in Square, add it here too:

```javascript
'YourNewCategory': {
  title: 'YourNewCategory',
  description: 'Your custom description here...',
},
```

### Tips:

- Keep descriptions under 200 characters for best display
- Use clear, engaging language
- Mention key features or benefits
- Stay consistent with your brand voice

### Need Help?

If you upgrade to Square Online or HubSpot Professional, we can pull descriptions from Square automatically!

