import { describe, expect, it } from 'vitest';
import { compile } from '../src/compile/compile';
import { SVJifErrorCode } from '../src/errors';

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
