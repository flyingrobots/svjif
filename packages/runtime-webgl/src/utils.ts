/**
 * Utility functions for SVJif rendering
 */

import type { SVJifScene } from '@svjif/core';
import { SVJifWebGLRenderer } from './WebGLRenderer.js';

/**
 * Render a SVJif scene to a canvas element
 *
 * @param scene - The SVJif scene to render
 * @returns Canvas element with the rendered scene
 */
export function renderSVJifToCanvas(scene: SVJifScene): HTMLCanvasElement {
  const renderer = new SVJifWebGLRenderer(
    scene.canvas.width,
    scene.canvas.height,
  );

  return renderer.render(scene);
}
