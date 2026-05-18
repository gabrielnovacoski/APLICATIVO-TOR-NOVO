export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface User {
  id: string;
  email?: string;
}

export interface AuthError {
  message: string;
  status?: number;
  name?: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

class AuthService {
  private static readonly ADMIN_EMAIL = 'gabrielnovacoski@gmail.com';
  // Use exact spelling matching the user's request. Wait, user provided: "gabrielnovacoski@gmai.com", but that's a typo in the user prompt (missing 'l' in gmail). 
  // I will support both to be safe.
  private static readonly ADMIN_EMAILS = ['gabrielnovacoski@gmail.com', 'gabrielnovacoski@gmai.com'];
  private static readonly ADMIN_PASS = 'Gn928635@';

  async signUp(data: SignUpData): Promise<AuthResponse> {
    return { user: null, error: { message: 'Cadastro desabilitado.' } };
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const isEmailValid = AuthService.ADMIN_EMAILS.includes(email.toLowerCase());
    if (isEmailValid && password === AuthService.ADMIN_PASS) {
      const user = { id: 'admin', email: 'gabrielnovacoski@gmail.com' };
      localStorage.setItem('tor_session', JSON.stringify(user));
      this.notifyListeners(user);
      return { user, error: null };
    }
    return { user: null, error: { message: 'Credenciais incorretas' } };
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    localStorage.removeItem('tor_session');
    this.notifyListeners(null);
    return { error: null };
  }

  async getCurrentUser(): Promise<User | null> {
    const sessionStr = localStorage.getItem('tor_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session && session.id === 'admin') {
          return session;
        }
      } catch (e) {}
    }
    return null;
  }

  async getSession() {
    const user = await this.getCurrentUser();
    return user ? { user } : null;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (userId === 'admin') {
      return {
        id: 'admin',
        email: 'gabrielnovacoski@gmail.com',
        full_name: 'Administrador (Gabriel)',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    return null;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return [];
  }

  async updateUserRole(userId: string, newRole: 'admin' | 'editor' | 'viewer'): Promise<boolean> {
    return false;
  }

  async toggleUserActive(userId: string, isActive: boolean): Promise<boolean> {
    return false;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return false;
  }

  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    return { error: { message: 'Não suportado.' } };
  }

  async resetPasswordRequest(email: string): Promise<{ error: AuthError | null }> {
    return { error: { message: 'Não suportado.' } };
  }

  async hasAnyUsers(): Promise<boolean> {
    return true; // We have the hardcoded admin
  }

  async createFirstAdmin(email: string, password: string, fullName: string): Promise<AuthResponse> {
    return { user: null, error: { message: 'Setup desabilitado' } };
  }

  private listeners: ((user: User | null) => void)[] = [];

  onAuthStateChange(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    return { data: { subscription: { unsubscribe: () => { this.listeners = this.listeners.filter(l => l !== callback); } } } };
  }

  private notifyListeners(user: User | null) {
    this.listeners.forEach(l => l(user));
  }
}

export const authService = new AuthService();
