// Mock artifacts per tool. Used by artifact index + detail pages.

export type ArtifactKind =
  | 'page'
  | 'video'
  | 'image'
  | 'email-template'
  | 'email-sequence'
  | 'migration'
  | 'legal-doc'
  | 'brand-asset'
  | 'copy'
  | 'config';

export type ArtifactSource =
  | 'claude-authored'
  | 'cache-hit'
  | 'fallback'
  | 'validate-failed'
  | 'hand-edited'
  | 'locked';

export interface MockArtifact {
  id: string;
  businessId: string;
  tool: string;
  kind: ArtifactKind;
  name: string;
  path?: string;
  size?: string;
  source: ArtifactSource;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  preview?: string;
}

export const mockArtifacts: MockArtifact[] = [];

export function artifactsForTool(businessId: string, tool: string): MockArtifact[] {
  return mockArtifacts.filter(
    (a) => a.businessId === businessId && a.tool === tool
  );
}

export function getArtifact(id: string): MockArtifact | undefined {
  return mockArtifacts.find((a) => a.id === id);
}



// __BF_CLEAN_GUARD__ — production deploys (NEXT_PUBLIC_BF_CLEAN=1)
// see no mock data; UI shows empty states instead of fixtures.
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BF_CLEAN === '1') {
  (mockArtifacts as Array<unknown>).length = 0;
}
