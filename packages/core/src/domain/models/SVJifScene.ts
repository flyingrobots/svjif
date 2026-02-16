/**
 * SVJif Scene Type Definitions
 *
 * Root scene graph structure.
 */

import type { Bounds, SVJifNode } from './SVJifNode.js';

/** Scene version */
export type SVJifVersion = '0.1.0';

/** Coordinate units */
export type Units = 'px' | 'pt' | 'em';

/** Coordinate origin */
export type Origin = 'top-left' | 'center' | 'bottom-left';

/** Scene metadata */
export interface SVJifMeta {
  /** Tool that generated this scene */
  readonly generator: string;

  /** Source file/identifier */
  readonly source: string;

  /** Content hash for verification */
  readonly hash: string;

  /** Timestamp */
  readonly timestamp?: string;
}

/** Canvas definition */
export interface SVJifCanvas {
  /** Canvas width */
  readonly width: number;

  /** Canvas height */
  readonly height: number;

  /** Coordinate units */
  readonly units: Units;

  /** Coordinate origin */
  readonly origin: Origin;
}

/** Design token map */
export interface SVJifTokens {
  readonly [tokenName: string]: string;
}

/** Hit region for interaction */
export interface HitRegion {
  /** Node ID this region maps to */
  readonly id: string;

  /** Hit bounds */
  readonly bounds: Bounds;
}

/** Interaction metadata */
export interface SVJifInteraction {
  /** Hit regions for pointer events */
  readonly hitRegions: readonly HitRegion[];
}

/** Complete SVJif scene */
export interface SVJifScene {
  /** Scene format version */
  readonly version: SVJifVersion;

  /** Scene metadata */
  readonly meta: SVJifMeta;

  /** Canvas definition */
  readonly canvas: SVJifCanvas;

  /** Scene nodes */
  readonly nodes: readonly SVJifNode[];

  /** Design tokens */
  readonly tokens: SVJifTokens;

  /** Interaction metadata (optional) */
  readonly interaction?: SVJifInteraction;

  /** Diagnostics/warnings from compilation (optional) */
  readonly diagnostics?: readonly string[];
}

/** Type guard for SVJif scene */
export function isSVJifScene(value: unknown): value is SVJifScene {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const scene = value as Record<string, unknown>;

  return (
    typeof scene['version'] === 'string' &&
    typeof scene['meta'] === 'object' &&
    typeof scene['canvas'] === 'object' &&
    Array.isArray(scene['nodes']) &&
    typeof scene['tokens'] === 'object'
  );
}
