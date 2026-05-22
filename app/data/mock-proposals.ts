// Mock improvement-loop proposals. Used by /app/business/[id]/proposals.

export type ProposalMode = 'tune' | 'mechanism';
export type ProposalSeverity = 'low' | 'medium' | 'high';

export interface MockProposal {
  id: string;
  businessId: string;
  targetTool: string;
  mode: ProposalMode;
  severity: ProposalSeverity;
  title: string;
  description: string;
  reasoning: string;
  diff: string;
  age: string;
  createdBy: 'auto' | 'human';
  status: 'open' | 'applied' | 'rejected' | 'snoozed';
}

export const mockProposals: MockProposal[] = [];

export function proposalsForBusiness(businessId: string) {
  return mockProposals.filter((p) => p.businessId === businessId);
}



// __BF_CLEAN_GUARD__ — production deploys (NEXT_PUBLIC_BF_CLEAN=1)
// see no mock data; UI shows empty states instead of fixtures.
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BF_CLEAN === '1') {
  (mockProposals as Array<unknown>).length = 0;
}
