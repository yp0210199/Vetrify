import React from 'react';
import { MediaUploader, MediaUploaderProps } from './MediaUploader';

export const ImageUploader: React.FC<Omit<MediaUploaderProps, 'category'> & { category?: MediaUploaderProps['category'] }> = ({
  category = 'product-image',
  label = 'Upload Image',
  ...props
}) => {
  return <MediaUploader category={category} label={label} {...props} />;
};

export const DocumentUploader: React.FC<Omit<MediaUploaderProps, 'category'> & { category?: MediaUploaderProps['category'] }> = ({
  category = 'general-document',
  label = 'Upload Document',
  ...props
}) => {
  return <MediaUploader category={category} label={label} {...props} />;
};
