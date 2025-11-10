import {
  ModuleFields,
  TextField,
  FieldGroup,
} from '@hubspot/cms-components/fields';

export function Component({ fieldValues }) {
  const { sectionTitle, sectionSubtitle, testimonial1, testimonial2, testimonial3 } = fieldValues;
  const testimonials = [testimonial1, testimonial2, testimonial3].filter(t => t?.quote);

  return (
    <section className="py-20 bg-beige">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {sectionTitle || 'What Our Customers Say'}
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            {sectionSubtitle || 'Real love from real customers as they shared what they feel about our products'}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials?.map((testimonial, index) => {
            const rating = parseInt(testimonial.rating || '5', 10);
            return (
              <div
                key={index}
                className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                {/* Star Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Testimonial Text */}
                {testimonial.quote && (
                  <p className="text-gray-700 mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                )}

                {/* Customer Info */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-semibold text-gray-900">
                    {testimonial.customerName || 'Anonymous'}
                  </p>
                  {testimonial.customerRole && (
                    <p className="text-sm text-gray-500">
                      {testimonial.customerRole}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
      default="What Our Customers Say"
      helpText="Main heading for the testimonials section"
    />
    <TextField
      name="sectionSubtitle"
      label="Section Subtitle"
      default="Real love from real customers as they shared what they feel about our products"
      helpText="Description text below the title"
    />
    <FieldGroup name="testimonial1" label="Testimonial 1">
      <TextField
        name="rating"
        label="Star Rating"
        default="5"
        helpText="Number of stars (1-5)"
      />
      <TextField
        name="quote"
        label="Testimonial Quote"
        helpText="The customer's testimonial text"
      />
      <TextField
        name="customerName"
        label="Customer Name"
        helpText="Name of the customer"
      />
      <TextField
        name="customerRole"
        label="Customer Role/Title"
        default="Verified Buyer"
        helpText="Customer's role or location (e.g., 'Verified Buyer', 'New York, NY')"
      />
    </FieldGroup>
    <FieldGroup name="testimonial2" label="Testimonial 2">
      <TextField
        name="rating"
        label="Star Rating"
        default="5"
        helpText="Number of stars (1-5)"
      />
      <TextField
        name="quote"
        label="Testimonial Quote"
        helpText="The customer's testimonial text"
      />
      <TextField
        name="customerName"
        label="Customer Name"
        helpText="Name of the customer"
      />
      <TextField
        name="customerRole"
        label="Customer Role/Title"
        default="Verified Buyer"
        helpText="Customer's role or location (e.g., 'Verified Buyer', 'New York, NY')"
      />
    </FieldGroup>
    <FieldGroup name="testimonial3" label="Testimonial 3">
      <TextField
        name="rating"
        label="Star Rating"
        default="5"
        helpText="Number of stars (1-5)"
      />
      <TextField
        name="quote"
        label="Testimonial Quote"
        helpText="The customer's testimonial text"
      />
      <TextField
        name="customerName"
        label="Customer Name"
        helpText="Name of the customer"
      />
      <TextField
        name="customerRole"
        label="Customer Role/Title"
        default="Verified Buyer"
        helpText="Customer's role or location (e.g., 'Verified Buyer', 'New York, NY')"
      />
    </FieldGroup>
  </ModuleFields>
);

export const meta = {
  label: 'Testimonials',
  description: 'Customer testimonials section with ratings and quotes',
  icon: 'star',
  categories: ['social-proof', 'testimonials'],
};
