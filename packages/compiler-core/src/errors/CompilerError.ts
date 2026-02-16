import type { Diagnostic, SourceLocation } from '../types';
import type { SVJifErrorCodeValue } from './codes';

export interface CompilerErrorOptions {
  location?: SourceLocation;
  hint?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class CompilerError extends Error {
  public readonly code: SVJifErrorCodeValue;
  public readonly location?: SourceLocation;
  public readonly hint?: string;
  public readonly details?: Record<string, unknown>;
  public override readonly cause?: unknown;
  public readonly severity: 'error' | 'warning' | 'info';

  constructor(
    code: SVJifErrorCodeValue,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    options: CompilerErrorOptions = {},
  ) {
    super(message);
    this.name = 'CompilerError';
    this.code = code;
    this.severity = severity;
    this.location = options.location;
    this.hint = options.hint;
    this.details = options.details;
    this.cause = options.cause;
  }

  toDiagnostic(): Diagnostic {
    return {
      code: this.code,
      severity: this.severity,
      message: this.message,
      location: this.location,
      hint: this.hint,
      details: this.details,
    };
  }
}
