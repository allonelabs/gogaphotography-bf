export interface MockIntegration {
  id: string;
  name: string;
  category: 'payments' | 'email' | 'infra' | 'crm' | 'analytics' | 'support' | 'social' | 'dev';
  logo: string;    // mono text / icon
  connected: boolean;
  account?: string;
  lastSync?: string;
  description: string;
}

export const mockIntegrations: MockIntegration[] = [];



// __BF_CLEAN_GUARD__ — production deploys (NEXT_PUBLIC_BF_CLEAN=1)
// see no mock data; UI shows empty states instead of fixtures.
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BF_CLEAN === '1') {
  (mockIntegrations as Array<unknown>).length = 0;
}
