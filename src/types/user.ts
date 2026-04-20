// User types
export interface User {
  full_name: string;
  email: string;
  id: string;
  username: string;
  role: 'teacher' | 'student';
  created_at: string;
}

// API Response types
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}