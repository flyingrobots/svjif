import { CompilerError, type CompilerErrorOptions } from './CompilerError';
import { SVJifErrorCode } from './codes';

export class InternalCompilerError extends CompilerError {
  constructor(message: string, options: CompilerErrorOptions = {}) {
    super(SVJifErrorCode.E_INTERNAL_INVARIANT, message, 'error', options);
    this.name = 'InternalCompilerError';
  }
}
