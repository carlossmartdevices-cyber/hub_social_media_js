import React from 'react';
import { render, screen } from '@testing-library/react';
import VideoUploader from '../VideoUploader';

describe('VideoUploader', () => {
  it('renders upload button', () => {
    render(<VideoUploader />);
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  // Add more UI interaction tests
});
