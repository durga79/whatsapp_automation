export interface User {
  _id: string;
  email: string;
  orgId: string;
  name?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null; // JWT Token
  apiKey: string | null; // Generated API Key
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

