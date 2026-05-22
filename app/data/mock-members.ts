export type Role = 'Owner' | 'Admin' | 'Operator' | 'Viewer';

export interface MockMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;   // 2-letter initial
  lastActive: string;
  joinedAt: string;
  status: 'active' | 'pending' | 'suspended';
}

export const mockMembers: MockMember[] = [];



// __BF_CLEAN_GUARD__ — production deploys (NEXT_PUBLIC_BF_CLEAN=1)
// see no mock data; UI shows empty states instead of fixtures.
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BF_CLEAN === '1') {
  (mockMembers as Array<unknown>).length = 0;
}
