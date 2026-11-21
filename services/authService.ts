export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  avatar_url?: string;
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
  public static readonly AUTHORIZED_GOOGLE_EMAIL = 'torpmrv@gmail.com';
  private static readonly ADMIN_EMAILS = [
    'torpmrv@gmail.com',
    'gabrielnovacoski@gmail.com'
  ];
  private static readonly ADMIN_PASS = 'odin2018#';

  /**
   * Decodifica o token JWT emitido pelo Google Identity Services
   */
  public parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Erro ao decodificar JWT do Google:', e);
      return null;
    }
  }

  /**
   * Realiza login a partir da credencial JWT fornecida pelo Google
   */
  async signInWithGoogleCredential(credential: string): Promise<AuthResponse> {
    const payload = this.parseJwt(credential);
    if (!payload || !payload.email) {
      return { user: null, error: { message: 'Token de autenticação do Google inválido.' } };
    }

    const email = payload.email.toLowerCase();
    if (email !== AuthService.AUTHORIZED_GOOGLE_EMAIL) {
      return {
        user: null,
        error: {
          message: `Acesso negado: a conta ${payload.email} não possui permissão de Gestor. O acesso é restrito à conta ${AuthService.AUTHORIZED_GOOGLE_EMAIL}.`
        }
      };
    }

    const user: User = {
      id: 'admin',
      email: payload.email
    };

    const sessionData = {
      id: 'admin',
      email: payload.email,
      full_name: payload.name || 'Gestor TOR (CPMRv)',
      avatar_url: payload.picture || null,
      auth_provider: 'google',
      created_at: new Date().toISOString()
    };

    localStorage.setItem('tor_session', JSON.stringify(sessionData));
    this.notifyListeners(user);
    return { user, error: null };
  }

  /**
   * Realiza login direto de 1 clique como Gestor do TOR
   */
  async signInDirectAsManager(email: string = AuthService.AUTHORIZED_GOOGLE_EMAIL): Promise<AuthResponse> {
    const user: User = {
      id: 'admin',
      email: email.toLowerCase()
    };

    const sessionData = {
      id: 'admin',
      email: email.toLowerCase(),
      full_name: 'Gestor TOR (CPMRv)',
      avatar_url: null,
      auth_provider: 'direct',
      created_at: new Date().toISOString()
    };

    localStorage.setItem('tor_session', JSON.stringify(sessionData));
    this.notifyListeners(user);
    return { user, error: null };
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    return { user: null, error: { message: 'Cadastro desabilitado.' } };
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const isEmailValid = AuthService.ADMIN_EMAILS.includes(cleanEmail);
    if (isEmailValid && cleanPass === AuthService.ADMIN_PASS) {
      const user = { 
        id: 'admin', 
        email: cleanEmail,
        full_name: 'Gestor TOR (CPMRv)'
      };
      localStorage.setItem('tor_session', JSON.stringify(user));
      this.notifyListeners(user);
      return { user, error: null };
    }
    return { user: null, error: { message: 'E-mail ou senha incorretos' } };
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
      let email = AuthService.AUTHORIZED_GOOGLE_EMAIL;
      let fullName = 'Administrador (TOR CPMRv)';
      let avatarUrl: string | undefined = undefined;

      const sessionStr = localStorage.getItem('tor_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.email) email = session.email;
          if (session.full_name) fullName = session.full_name;
          if (session.avatar_url) avatarUrl = session.avatar_url;
        } catch (e) {}
      }

      return {
        id: 'admin',
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
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
