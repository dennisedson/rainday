import {
  ModuleFields,
  TextField,
  RepeatedFieldGroup,
  ImageField,
} from '@hubspot/cms-components/fields';

export function Component({ fieldValues }) {
  const { sectionTitle, sectionSubtitle, categories = [] } = fieldValues;
  // Filter out empty categories and limit to 4
  const displayCategories = categories.filter(c => c?.categoryName).slice(0, 4);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {sectionTitle || 'Shop by Category'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {sectionSubtitle || 'Explore our diverse collection of handcrafted jewelry and artisan crafts'}
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayCategories && displayCategories.map((category, index) => (
            <a
              key={index}
              href={category.link || '#'}
              className="group block bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Category Image */}
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                <div className="absolute inset-0 bg-gray-100 overflow-hidden">
                {category.image?.src ? (
                  <img
                    src={category.image.src}
                    alt={category.image.alt || category.categoryName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                </div>
              </div>

              {/* Category Info */}
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors duration-200">
                  {category.categoryName || 'Category'}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      name="sectionTitle"
      label="Section Title"
      default="Shop by Category"
      helpText="Main heading for the category section"
    />
    <TextField
      name="sectionSubtitle"
      label="Section Subtitle"
      default="Explore our diverse collection of handcrafted jewelry and artisan crafts"
      helpText="Description text below the title"
    />
    <RepeatedFieldGroup
      name="categories"
      label="Categories"
      occurrence={{
        min: 0,
        max: 4,
        default: 0,
      }}
      default={[]}
    >
      <TextField
        name="categoryName"
        label="Category Name"
        required={false}
        default=""
        helpText="Name of the category (e.g., 'Bracelets', 'Necklaces')"
      />
      <ImageField
        name="image"
        label="Category Image"
        default={{
          src: '',
          alt: '',
        }}
        helpText="Upload an image for this category"
      />
      <TextField
        name="link"
        label="Category Link"
        default="/shop"
        helpText="URL to the category page (e.g., '/shop?category=Bracelets')"
      />
    </RepeatedFieldGroup>
  </ModuleFields>
);

export const meta = {
  label: 'Category Grid',
  description: 'Shop by category section with category cards',
  icon: 'grid',
  categories: ['ecommerce', 'navigation'],
};
