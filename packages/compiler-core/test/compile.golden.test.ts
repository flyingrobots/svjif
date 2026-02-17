import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/compile/compile';
import { SVJifErrorCode } from '../src/errors';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

describe('compile() golden path', () => {
  it('valid canonical AST JSON fixture compiles and emits core artifacts', async () => {
    const validCanonicalAst = {
      kind: 'Scene',
      astVersion: '1',
      scene: {
        id: 'scene:terminal',
        width: 800,
        height: 600,
        units: 'px',
        background: '#1a1a1a',
      },
      nodes: [
        {
          id: 'node:header',
          kind: 'Rect',
          props: {
            x: 0,
            y: 0,
            width: 800,
            height: 40,
            fill: '#2a2a2a',
          },
          zIndex: 1,
          visible: true,
        },
        {
          id: 'node:title',
          kind: 'Text',
          props: {
            x: 20,
            y: 10,
            content: 'Terminal v0.3',
            color: '#00ff00',
            fontSize: 14,
          },
          zIndex: 2,
          visible: true,
        },
      ],
      metadata: {
        sourceFormat: 'canonical-ast-json',
      },
    };

    const result = await compile({
      format: 'canonical-ast-json',
      source: JSON.stringify(validCanonicalAst),
      filename: 'fixtures/valid.scene.json',
      options: {
        target: 'svjif-ir-v1',
        emit: {
          irJson: true,
          tsTypes: true,
          jsonSchema: false,
          binaryPack: false,
        },
        strict: true,
        failOnWarnings: false,
        deterministicIds: true,
        canonicalize: true,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);

    expect(result.artifacts['scene.svjif.json']).toBeDefined();
    expect(result.artifacts['types.ts']).toBeDefined();

    const irRaw = result.artifacts['scene.svjif.json'].content;
    expect(typeof irRaw === 'string').toBe(true);

    const ir = JSON.parse(String(irRaw));
    expect(ir.irVersion).toBe('svjif-ir/1');
    expect(ir.scene.id).toBe('scene:terminal');
    expect(Array.isArray(ir.nodes)).toBe(true);
    expect(ir.nodes.length).toBe(2);
  });

  it('scene.svjif.json.receipt is present on successful compile', async () => {
    const validCanonicalAst = {
      kind: 'Scene',
      astVersion: '1',
      scene: { id: 'scene:receipt-test', width: 400, height: 300 },
      nodes: [
        { id: 'n1', kind: 'Rect', props: { x: 0, y: 0, width: 400, height: 300, fill: '#000' }, zIndex: 1 },
      ],
      metadata: { sourceFormat: 'canonical-ast-json' },
    };

    const source = JSON.stringify(validCanonicalAst);
    const result = await compile({
      format: 'canonical-ast-json',
      source,
      options: { target: 'svjif-ir-v1', emit: { irJson: true, tsTypes: false }, strict: true, failOnWarnings: false, deterministicIds: true, canonicalize: true },
    });

    expect(result.ok).toBe(true);
    expect(result.artifacts['scene.svjif.json.receipt']).toBeDefined();

    const receipt = JSON.parse(String(result.artifacts['scene.svjif.json.receipt'].content));
    expect(receipt.comparatorVersion).toBe('1');
    expect(receipt.irVersion).toBe('svjif-ir/1');
    expect(typeof receipt.inputHash).toBe('string');
    expect(receipt.inputHash).toBe(sha256(source));
    expect(typeof receipt.rulesetFingerprint).toBe('string');
  });

  it('inputHash in receipt matches sha256(input.source)', async () => {
    const source = JSON.stringify({
      kind: 'Scene', astVersion: '1',
      scene: { id: 'scene:hash-check', width: 100, height: 100 },
      nodes: [{ id: 'r1', kind: 'Rect', props: { width: 10, height: 10 }, zIndex: 1 }],
      metadata: { sourceFormat: 'canonical-ast-json' },
    });

    const result = await compile({
      format: 'canonical-ast-json',
      source,
      options: { target: 'svjif-ir-v1', emit: { irJson: true, tsTypes: false }, strict: true, failOnWarnings: false, deterministicIds: true, canonicalize: true },
    });

    expect(result.ok).toBe(true);
    const receipt = JSON.parse(String(result.artifacts['scene.svjif.json.receipt'].content));
    expect(receipt.inputHash).toBe(sha256(source));
  });

  it('two compilations of the same input → byte-identical receipts', async () => {
    const source = JSON.stringify({
      kind: 'Scene', astVersion: '1',
      scene: { id: 'scene:idempotent', width: 200, height: 200 },
      nodes: [{ id: 'n1', kind: 'Group', props: { x: 0, y: 0 }, zIndex: 1 }],
      metadata: { sourceFormat: 'canonical-ast-json' },
    });

    const input = {
      format: 'canonical-ast-json' as const,
      source,
      options: { target: 'svjif-ir-v1' as const, emit: { irJson: true, tsTypes: false }, strict: true, failOnWarnings: false, deterministicIds: true, canonicalize: true },
    };

    const r1 = await compile(input);
    const r2 = await compile(input);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    const rec1 = String(r1.artifacts['scene.svjif.json.receipt'].content);
    const rec2 = String(r2.artifacts['scene.svjif.json.receipt'].content);
    expect(rec1).toBe(rec2);
    expect(sha256(rec1)).toBe(sha256(rec2));
  });

  it('invalid fixture (empty input) fails with deterministic error code', async () => {
    const result = await compile({
      format: 'canonical-ast-json',
      source: '   ',
      filename: 'fixtures/invalid.empty.json',
      options: {
        target: 'svjif-ir-v1',
        emit: {
          irJson: true,
          tsTypes: true,
        },
        strict: true,
        failOnWarnings: false,
        deterministicIds: true,
        canonicalize: true,
      },
    });

    expect(result.ok).toBe(false);

    const errorCodes = result.diagnostics
      .filter((d) => d.severity === 'error')
      .map((d) => d.code);

    expect(errorCodes).toContain(SVJifErrorCode.E_INPUT_EMPTY);
  });
});
