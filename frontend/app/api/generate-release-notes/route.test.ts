import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn();
  MockAnthropic.prototype.messages = {
    create: vi.fn(),
  };
  return {
    default: MockAnthropic,
  };
});

describe('Generate Release Notes API Route', () => {
  let mockAnthropicInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mock Anthropic instance
    mockAnthropicInstance = new (Anthropic as any)();

    // Reset environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should return 400 when no tickets provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({ tickets: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No tickets provided');
    });

    it('should return 400 when tickets is null', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({ tickets: null }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No tickets provided');
    });

    it('should return 400 when tickets is undefined', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No tickets provided');
    });
  });

  describe('API Key Validation', () => {
    it('should return 500 when ANTHROPIC_API_KEY not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test ticket' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('ANTHROPIC_API_KEY not configured');
    });
  });

  describe('Release Notes Generation', () => {
    it('should generate release notes with valid tickets', async () => {
      const mockReleaseNotes = `## Release Notes

### New Features
- Added new feature

### Bug Fixes
- Fixed critical bug`;

      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: mockReleaseNotes,
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            {
              key: 'TEST-1',
              summary: 'Add new feature',
              description: 'Feature description',
              issueType: 'Story',
              status: 'Done',
              priority: 'High',
            },
            {
              key: 'TEST-2',
              summary: 'Fix critical bug',
              description: 'Bug description',
              issueType: 'Bug',
              status: 'Done',
              priority: 'Critical',
            },
          ],
          sprintName: 'Sprint 25',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.releaseNotes).toBe(mockReleaseNotes);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Sprint 25'),
          },
        ],
      });
    });

    it('should handle tickets with minimal information', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Release notes content',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            {
              key: 'TEST-1',
              summary: 'Minimal ticket',
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.releaseNotes).toBe('Release notes content');
    });

    it('should truncate long descriptions', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Release notes',
          },
        ],
      });

      const longDescription = 'a'.repeat(1000);

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            {
              key: 'TEST-1',
              summary: 'Test ticket',
              description: longDescription,
            },
          ],
        }),
      });

      await POST(request);

      const calledPrompt = mockAnthropicInstance.messages.create.mock.calls[0][0].messages[0].content;

      // Should contain truncated description with ellipsis
      expect(calledPrompt).toContain('...');
      // Should not contain the full 1000 character description
      expect(calledPrompt).not.toContain('a'.repeat(1000));
    });

    it('should use default sprint name when not provided', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Release notes',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      await POST(request);

      const calledPrompt = mockAnthropicInstance.messages.create.mock.calls[0][0].messages[0].content;
      expect(calledPrompt).toContain('this sprint');
    });

    it('should handle multiple text blocks in response', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Part 1',
          },
          {
            type: 'text',
            text: 'Part 2',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.releaseNotes).toBe('Part 1\nPart 2');
    });

    it('should filter out non-text blocks from response', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: 'Text content',
          },
          {
            type: 'tool_use',
            name: 'some_tool',
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.releaseNotes).toBe('Text content');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when Anthropic API fails', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('API rate limit exceeded');
    });

    it('should handle unknown errors', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValueOnce('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate release notes');
    });

    it('should handle malformed JSON in request', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('Ticket Formatting', () => {
    it('should include all ticket fields in prompt', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Notes' }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            {
              key: 'PROJ-123',
              summary: 'Implement feature X',
              description: 'Detailed description',
              issueType: 'Story',
              status: 'Done',
              priority: 'High',
            },
          ],
        }),
      });

      await POST(request);

      const calledPrompt = mockAnthropicInstance.messages.create.mock.calls[0][0].messages[0].content;

      expect(calledPrompt).toContain('PROJ-123');
      expect(calledPrompt).toContain('Implement feature X');
      expect(calledPrompt).toContain('Type: Story');
      expect(calledPrompt).toContain('Status: Done');
      expect(calledPrompt).toContain('Priority: High');
      expect(calledPrompt).toContain('Description: Detailed description');
    });

    it('should handle tickets with missing optional fields', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Notes' }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            {
              key: 'PROJ-123',
              summary: 'Basic ticket',
            },
          ],
        }),
      });

      await POST(request);

      const calledPrompt = mockAnthropicInstance.messages.create.mock.calls[0][0].messages[0].content;

      expect(calledPrompt).toContain('PROJ-123');
      expect(calledPrompt).toContain('Basic ticket');
      expect(calledPrompt).toContain('Type: N/A');
      expect(calledPrompt).toContain('Status: N/A');
      expect(calledPrompt).toContain('Priority: N/A');
    });

    it('should separate multiple tickets with divider', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Notes' }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [
            { key: 'TEST-1', summary: 'First' },
            { key: 'TEST-2', summary: 'Second' },
          ],
        }),
      });

      await POST(request);

      const calledPrompt = mockAnthropicInstance.messages.create.mock.calls[0][0].messages[0].content;

      expect(calledPrompt).toContain('---');
      expect(calledPrompt).toContain('TEST-1');
      expect(calledPrompt).toContain('TEST-2');
    });
  });

  describe('Model Configuration', () => {
    it('should use correct Claude model', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Notes' }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      await POST(request);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
        })
      );
    });

    it('should use correct max_tokens', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Notes' }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-release-notes', {
        method: 'POST',
        body: JSON.stringify({
          tickets: [{ key: 'TEST-1', summary: 'Test' }],
        }),
      });

      await POST(request);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
        })
      );
    });
  });
});
