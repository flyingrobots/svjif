import { describe, it, expect } from 'vitest';

import type { SVJifScene } from './SVJifScene.js';

describe('SVJifScene', (): void => {
  it('should create a valid scene with metadata', (): void => {
    const scene: SVJifScene = {
      version: '0.1.0',
      meta: {
        generator: '@svjif/vue',
        source: 'Terminal.vue',
        hash: 'sha256:abc123',
      },
      canvas: {
        width: 800,
        height: 600,
        units: 'px',
        origin: 'top-left',
      },
      nodes: [],
      tokens: {},
    };

    expect(scene.version).toBe('0.1.0');
    expect(scene.canvas.width).toBe(800);
    expect(scene.canvas.height).toBe(600);
  });

  it('should contain nodes with proper references', (): void => {
    const scene: SVJifScene = {
      version: '0.1.0',
      meta: {
        generator: '@svjif/core',
        source: 'test',
        hash: 'sha256:test',
      },
      canvas: {
        width: 800,
        height: 600,
        units: 'px',
        origin: 'top-left',
      },
      nodes: [
        {
          id: 'bg',
          type: 'rect',
          bounds: [0, 0, 800, 600],
          style: {
            paint: {
              fill: { type: 'solid', color: '#1a1a1a' },
            },
          },
          static: true,
        },
        {
          id: 'text',
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
          content: 'Hello',
          static: false,
        },
      ],
      tokens: {
        'bg-dark': '#1a1a1a',
        'color-success': '#00ff00',
      },
    };

    expect(scene.nodes).toHaveLength(2);
    expect(scene.nodes[0]?.id).toBe('bg');
    expect(scene.nodes[1]?.id).toBe('text');
    expect(scene.tokens['bg-dark']).toBe('#1a1a1a');
  });

  it('should have interaction hit regions', (): void => {
    const scene: SVJifScene = {
      version: '0.1.0',
      meta: {
        generator: '@svjif/core',
        source: 'test',
        hash: 'sha256:test',
      },
      canvas: {
        width: 800,
        height: 600,
        units: 'px',
        origin: 'top-left',
      },
      nodes: [],
      tokens: {},
      interaction: {
        hitRegions: [
          {
            id: 'button-1',
            bounds: [10, 10, 100, 40],
          },
        ],
      },
    };

    expect(scene.interaction?.hitRegions).toHaveLength(1);
    expect(scene.interaction?.hitRegions[0]?.id).toBe('button-1');
  });
});
