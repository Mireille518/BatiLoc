// Minimal TypeScript declarations for the api.js module used by the frontend
declare module './config/api' {
  const API_BASE_URL: string;
  export function getAuthToken(): string | null;
  export function apiRequest(endpoint: string, options?: any): Promise<any>;
  export const API_ENDPOINTS: {
    LOGIN: string;
    REGISTER: string;
    PROFILE: string;
    USERS: string;
    BATIMENTS: string;
    BATIMENT: (id: any) => string;
    CONVENTIONS: string;
    CONVENTION: (id: any) => string;
    CONVENTIONS_AVAILABLE_FOR_INVOICE: string;
    FACTURES: string;
    FACTURE: (id: any) => string;
    FACTURES_STATS: string;
  };
  export default API_BASE_URL;
}

declare module './config/api.js' {
  const API_BASE_URL: string;
  export function getAuthToken(): string | null;
  export function apiRequest(endpoint: string, options?: any): Promise<any>;
  export const API_ENDPOINTS: {
    LOGIN: string;
    REGISTER: string;
    PROFILE: string;
    USERS: string;
    BATIMENTS: string;
    BATIMENT: (id: any) => string;
    CONVENTIONS: string;
    CONVENTION: (id: any) => string;
    CONVENTIONS_AVAILABLE_FOR_INVOICE: string;
    FACTURES: string;
    FACTURE: (id: any) => string;
    FACTURES_STATS: string;
  };
  export default API_BASE_URL;
}
