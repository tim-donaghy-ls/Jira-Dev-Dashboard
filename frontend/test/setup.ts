import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';

// Mock fetch globally
global.fetch = vi.fn();

// Mock DOM APIs not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Add custom matchers
expect.extend({});
