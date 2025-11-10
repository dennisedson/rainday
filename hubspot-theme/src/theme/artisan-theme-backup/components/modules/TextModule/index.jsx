import { ModuleFields, TextField, RichTextField, ChoiceField, BooleanField } from '@hubspot/cms-components/fields';

/**
 * Text Module - Editable rich text content
 * Allows content editors to add any text content to pages
 */

export function Component({ fieldValues }) {
  const {
    heading,
    headingSize,
    content,
    textAlign,
    containerSize,
    showDivider,
  } = fieldValues;

  const headingSizeClasses = {
    h1: 'text-5xl md:text-6xl',
    h2: 'text-4xl md:text-5xl',
    h3: 'text-3xl md:text-4xl',
    h4: 'text-2xl md:text-3xl',
    h5: 'text-xl md:text-2xl',
    h6: 'text-lg md:text-xl',
  };

  const textAlignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const containerSizeClasses = {
    sm: 'max-w-4xl',
    default: 'max-w-7xl',
    lg: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  const HeadingTag = headingSize || 'h2';

  return (
    <div className={`${containerSizeClasses[containerSize]} mx-auto px-4 sm:px-6 lg:px-8 py-12`}>
      <div className={textAlignClasses[textAlign] || 'text-left'}>
        {heading && (
          <HeadingTag className={`font-display font-bold text-gray-900 mb-6 ${headingSizeClasses[headingSize]}`}>
            {heading}
          </HeadingTag>
        )}
        
        {content && (
          <div 
            className="prose prose-lg max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        
        {showDivider && (
          <hr className="mt-12 border-gray-200" />
        )}
      </div>
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <TextField
      label="Heading"
      name="heading"
      default=""
      helpText="Optional heading text"
    />
    
    <ChoiceField
      label="Heading Size"
      name="headingSize"
      default="h2"
      choices={[
        ['h1', 'H1 - Largest'],
        ['h2', 'H2 - Large'],
        ['h3', 'H3 - Medium'],
        ['h4', 'H4 - Small'],
        ['h5', 'H5 - Smaller'],
        ['h6', 'H6 - Smallest'],
      ]}
      display="select"
    />

    <RichTextField
      label="Content"
      name="content"
      default="<p>Add your content here...</p>"
      helpText="Main content text with rich formatting"
    />

    <ChoiceField
      label="Text Alignment"
      name="textAlign"
      default="left"
      choices={[
        ['left', 'Left'],
        ['center', 'Center'],
        ['right', 'Right'],
      ]}
      display="radio"
    />

    <ChoiceField
      label="Container Width"
      name="containerSize"
      default="default"
      choices={[
        ['sm', 'Small'],
        ['default', 'Medium'],
        ['lg', 'Large'],
        ['full', 'Full Width'],
      ]}
      display="select"
      helpText="Maximum width of the content container"
    />

    <BooleanField
      label="Show Bottom Divider"
      name="showDivider"
      default={false}
      helpText="Add a horizontal line at the bottom"
    />
  </ModuleFields>
);

export const meta = {
  label: 'Text Content',
  description: 'Rich text content block with customizable heading and alignment',
  icon: 'text',
  categories: ['content'],
};
