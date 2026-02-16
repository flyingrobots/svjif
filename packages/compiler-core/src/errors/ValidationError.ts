import { CompilerError, type CompilerErrorOptions } from './CompilerError';
import type { SVJifErrorCodeValue } from './codes';

export class ValidationError extends CompilerError {
  constructor(code: SVJifErrorCodeValue, message: string, options: CompilerErrorOptions = {}) {
    super(code, message, 'error', options);
    this.name = 'ValidationError';
  }
}
