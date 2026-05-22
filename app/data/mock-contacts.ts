export type ContactStage = 'lead' | 'qualified' | 'opportunity' | 'customer' | 'churned';

export interface MockContact {
  id: string;
  businessId: string;
  name: string;
  email: string;
  company?: string;
  stage: ContactStage;
  value?: string;
  lastActivity: string;
  source: string;
  tags?: string[];
}

export const mockContacts: MockContact[] = [];

export function contactsFor(businessId: string) {
  return mockContacts.filter((c) => c.businessId === businessId);
}



// __BF_CLEAN_GUARD__ — production deploys (NEXT_PUBLIC_BF_CLEAN=1)
// see no mock data; UI shows empty states instead of fixtures.
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BF_CLEAN === '1') {
  (mockContacts as Array<unknown>).length = 0;
}
