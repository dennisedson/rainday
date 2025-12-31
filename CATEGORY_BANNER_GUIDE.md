# How to Edit Category Banner Descriptions

Good news: **category banner text/images can be managed in HubSpot** (no code) via the `Category Banner` module.

Code edits are still supported as a fallback, but day-to-day updates should be done in HubSpot.

---

## Option A (Recommended): Edit in HubSpot (No Code)

1. In HubSpot, open the **Shop** page in the page editor.
2. Click the **Category Banner** module.
3. Find **Category Custom Content**.
4. Add or edit an entry:
   - **Category Name**: must exactly match the Square category name (example: `Bracelets`)
   - **Custom Description**: your banner text
   - **Custom Banner Image (Optional)**: upload an image if you want to override Square’s category image
5. Publish the page.

Notes:
- If no override exists, the banner will try **Square’s category description/image** (if available), and otherwise fall back to the default copy.

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

