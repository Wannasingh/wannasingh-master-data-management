import { render, screen } from '@testing-library/react';
import Dashboard from '../app/page';

describe('Master Data Dashboard', () => {
  it('renders the page title correctly', () => {
    render(<Dashboard />);
    
    // Assert page title
    const titleElement = screen.getByTestId('page-title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Master Data Dashboard');
  });

  it('renders the ETL Upload section and file input', () => {
    render(<Dashboard />);
    
    // Assert section heading
    expect(screen.getByText('ETL Upload')).toBeInTheDocument();
    
    // Assert upload button
    expect(screen.getByRole('button', { name: /upload data/i })).toBeInTheDocument();
  });

  it('renders the data table with correct headers', () => {
    render(<Dashboard />);
    
    // Assert headers
    expect(screen.getByRole('columnheader', { name: /id/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /value/i })).toBeInTheDocument();
  });
});
