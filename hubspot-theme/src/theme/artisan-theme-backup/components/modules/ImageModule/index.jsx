import { ModuleFields, ImageField, TextField, ChoiceField, BooleanField, UrlField } from '@hubspot/cms-components/fields';

/**
 * Image Module - Editable images with optional captions and links
 */

export function Component({ fieldValues }) {
  const {
    image,
    imageSize,
    caption,
    linkUrl,
    openInNewTab,
    imageRounded,
    showShadow,
  } = fieldValues;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full',
  };

  const ImageWrapper = linkUrl ? 'a' : 'div';
  const wrapperProps = linkUrl ? {
    href: linkUrl,
    target: openInNewTab ? '_blank' : '_self',
    rel: openInNewTab ? 'noopener noreferrer' : undefined,
  } : {};

  if (!image?.src) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <p className="text-gray-500">No image selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className={`mx-auto ${sizeClasses[imageSize]}`}>
        <ImageWrapper 
          className={`block ${linkUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          {...wrapperProps}
        >
          <img
            src={image.src}
            alt={image.alt || caption || ''}
            className={`w-full h-auto ${imageRounded ? 'rounded-xl' : ''} ${showShadow ? 'shadow-xl' : ''}`}
          />
        </ImageWrapper>
        
        {caption && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

export const fields = (
  <ModuleFields>
    <ImageField
      label="Image"
      name="image"
      required={true}
      resizable={true}
      helpText="Main image to display"
    />

    <ChoiceField
      label="Image Size"
      name="imageSize"
      default="large"
      choices={[
        ['small', 'Small'],
        ['medium', 'Medium'],
        ['large', 'Large'],
        ['full', 'Full Width'],
      ]}
      display="select"
    />

    <TextField
      label="Caption"
      name="caption"
      default=""
      helpText="Optional caption text below the image"
    />

    <UrlField
      label="Link URL"
      name="linkUrl"
      default=""
      helpText="Optional: Make the image clickable"
    />

    <BooleanField
      label="Open Link in New Tab"
      name="openInNewTab"
      default={false}
    />

    <BooleanField
      label="Rounded Corners"
      name="imageRounded"
      default={true}
    />

    <BooleanField
      label="Show Shadow"
      name="showShadow"
      default={true}
    />
  </ModuleFields>
);

export const meta = {
  label: 'Image',
  description: 'Display an image with optional caption and link',
  icon: 'image',
  categories: ['content', 'media'],
};
