# How to Edit Category Banner Descriptions

Since both HubSpot Free and Square Free don't support custom category descriptions, banner text is managed in code.

## Quick Edit Guide

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

## Steps to Update:

1. **Open the file** in your code editor
2. **Find your category** in the `categoryContent` object
3. **Edit the `description`** field
4. **Save the file**
5. **Run:** `cd hubspot-theme && hs project upload`
6. **Refresh your browser** - changes are live!

## What You Can Edit:

- ✅ **Description text** - The paragraph below the title
- ❌ **Title** - Matches Square category name (auto-generated)
- ❌ **Image** - Comes from Square (edit in Square dashboard)

## Adding New Categories:

When you add a new category in Square, add it here too:

```javascript
'YourNewCategory': {
  title: 'YourNewCategory',
  description: 'Your custom description here...',
},
```

## Tips:

- Keep descriptions under 200 characters for best display
- Use clear, engaging language
- Mention key features or benefits
- Stay consistent with your brand voice

## Need Help?

If you upgrade to Square Online or HubSpot Professional, we can pull descriptions from Square automatically!

