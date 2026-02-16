/**
 * SVJif WebGL Renderer
 *
 * POC implementation using Canvas 2D API.
 * WebGL shaders will be added in v0.2.
 */

import type {
  SVJifScene,
  SVJifNode,
  RectNode,
  TextNode,
} from '@svjif/core';
import { isRectNode, isTextNode } from '@svjif/core';

export class SVJifWebGLRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d', {
      alpha: true,
      desynchronized: false,
    });

    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }

    this.ctx = ctx;
  }

  /**
   * Render a complete SVJif scene to the canvas
   */
  render(scene: SVJifScene): HTMLCanvasElement {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render each node
    for (const node of scene.nodes) {
      this.renderNode(node);
    }

    return this.canvas;
  }

  /**
   * Render a single node (dispatches to type-specific renderer)
   */
  private renderNode(node: SVJifNode): void {
    if (isRectNode(node)) {
      this.renderRect(node);
    } else if (isTextNode(node)) {
      this.renderText(node);
    }
    // group and image nodes not yet implemented
  }

  /**
   * Render a rectangle node
   */
  private renderRect(node: RectNode): void {
    const [x, y, w, h] = node.bounds;
    const paint = node.style.paint;

    if (!paint) {
      return;
    }

    // Save context state
    this.ctx.save();

    // Handle opacity
    if (paint.opacity !== undefined) {
      this.ctx.globalAlpha = paint.opacity;
    }

    // Handle corner radius
    const cornerRadius = paint.cornerRadius;
    if (cornerRadius) {
      this.ctx.beginPath();
      if (typeof cornerRadius === 'number') {
        // Single radius for all corners
        this.roundRect(x, y, w, h, cornerRadius);
      } else {
        // Individual corner radii [topLeft, topRight, bottomRight, bottomLeft]
        this.roundRectComplex(x, y, w, h, cornerRadius);
      }
      this.ctx.closePath();
    } else {
      // No corner radius - simple rect
      this.ctx.beginPath();
      this.ctx.rect(x, y, w, h);
      this.ctx.closePath();
    }

    // Fill
    if (paint.fill) {
      if (paint.fill.type === 'solid') {
        this.ctx.fillStyle = paint.fill.color;
        this.ctx.fill();
      }
      // tokenRef fills would be resolved before rendering
    }

    // Stroke
    if (paint.stroke && paint.strokeWidth) {
      if (paint.stroke.type === 'solid') {
        this.ctx.strokeStyle = paint.stroke.color;
        this.ctx.lineWidth = paint.strokeWidth;
        this.ctx.stroke();
      }
    }

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render a text node
   */
  private renderText(node: TextNode): void {
    const [x, y] = node.bounds;
    const textStyle = node.style.text;

    if (!textStyle) {
      return;
    }

    // Save context state
    this.ctx.save();

    // Set font
    this.ctx.font = `${textStyle.weight} ${textStyle.size}px ${textStyle.font}`;
    this.ctx.fillStyle = textStyle.color;
    this.ctx.textBaseline = 'top';

    // Handle text alignment
    if (textStyle.align) {
      this.ctx.textAlign = textStyle.align;
    } else {
      this.ctx.textAlign = 'left';
    }

    // Handle opacity from paint style
    if (node.style.paint?.opacity !== undefined) {
      this.ctx.globalAlpha = node.style.paint.opacity;
    }

    // Render text
    this.ctx.fillText(node.content, x, y);

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Draw a rounded rectangle with uniform corner radius
   */
  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    // Clamp radius to reasonable bounds
    const r = Math.min(radius, width / 2, height / 2);

    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + width - r, y);
    this.ctx.arcTo(x + width, y, x + width, y + r, r);
    this.ctx.lineTo(x + width, y + height - r);
    this.ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    this.ctx.lineTo(x + r, y + height);
    this.ctx.arcTo(x, y + height, x, y + height - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
  }

  /**
   * Draw a rounded rectangle with individual corner radii
   */
  private roundRectComplex(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: readonly [number, number, number, number],
  ): void {
    const [tl, tr, br, bl] = radii;

    this.ctx.moveTo(x + tl, y);
    this.ctx.lineTo(x + width - tr, y);
    this.ctx.arcTo(x + width, y, x + width, y + tr, tr);
    this.ctx.lineTo(x + width, y + height - br);
    this.ctx.arcTo(x + width, y + height, x + width - br, y + height, br);
    this.ctx.lineTo(x + bl, y + height);
    this.ctx.arcTo(x, y + height, x, y + height - bl, bl);
    this.ctx.lineTo(x, y + tl);
    this.ctx.arcTo(x, y, x + tl, y, tl);
  }

  /**
   * Get the underlying canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the 2D rendering context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
