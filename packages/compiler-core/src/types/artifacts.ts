export interface Artifact {
  path: string;
  content: string | Uint8Array;
  mediaType?: string;
  encoding?: 'utf8' | 'binary';
  hash?: string;
}

export type ArtifactMap = Record<string, Artifact>;
