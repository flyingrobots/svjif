import { CompilerError, type CompilerErrorOptions } from './CompilerError';
import type { SVJifErrorCodeValue } from './codes';

export class ParseError extends CompilerError {
  constructor(code: SVJifErrorCodeValue, message: string, options: CompilerErrorOptions = {}) {
    super(code, message, 'error', options);
    this.name = 'ParseError';
  }
}
