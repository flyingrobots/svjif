export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface SourceLocation {
  file: string;
  line: number; // 1-based
  column: number; // 1-based
  endLine?: number;
  endColumn?: number;
}

export interface Diagnostic {
  code: string; // e.g. SVJIF_E_SCENE_MISSING
  severity: DiagnosticSeverity;
  message: string;
  location?: SourceLocation;
  hint?: string;
  details?: Record<string, unknown>;
}
