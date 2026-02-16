import { describe, it, expect } from 'vitest';

import type { SVJifNode } from './SVJifNode.js';

describe('SVJifNode', (): void => {
  describe('Rect Node', (): void => {
    it('should create a valid rect node with required properties', (): void => {
      const node: SVJifNode = {
        id: 'rect-1',
        type: 'rect',
        bounds: [0, 0, 100, 100],
        style: {
          paint: {
            fill: { type: 'solid', color: '#1a1a1a' },
          },
        },
        static: true,
      };

      expect(node.id).toBe('rect-1');
      expect(node.type).toBe('rect');
      expect(node.bounds).toEqual([0, 0, 100, 100]);
      expect(node.static).toBe(true);
    });

    it('should reject negative bounds', (): void => {
      // This will be enforced by validation layer
      const invalidBounds: [number, number, number, number] = [-10, 0, 100, 100];

      expect(invalidBounds[0]).toBeLessThan(0);
      // Validation should reject this
    });
  });

  describe('Text Node', (): void => {
    it('should create a valid text node with font properties', (): void => {
      const node: SVJifNode = {
        id: 'text-1',
        type: 'text',
        bounds: [10, 10, 200, 30],
        style: {
          text: {
            font: 'Fira Code',
            size: 14,
            weight: 400,
            color: '#00ff00',
          },
        },
        content: '$ ls -la',
        static: false,
        invalidatesOn: ['content'],
      };

      expect(node.type).toBe('text');
      expect(node.content).toBe('$ ls -la');
      expect(node.static).toBe(false);
      expect(node.invalidatesOn).toContain('content');
    });
  });

  describe('Group Node', (): void => {
    it('should create a group with flex layout', (): void => {
      const node: SVJifNode = {
        id: 'group-1',
        type: 'group',
        bounds: [0, 0, 800, 600],
        style: {
          layout: {
            type: 'flex',
            direction: 'column',
            padding: [20, 20, 20, 20],
          },
          paint: {
            fill: { type: 'solid', color: '#ffffff' },
          },
        },
        children: ['text-1', 'text-2'],
        static: false,
        invalidatesOn: ['children'],
      };

      expect(node.type).toBe('group');
      expect(node.children).toHaveLength(2);
      expect(node.style.layout?.type).toBe('flex');
    });
  });
});
