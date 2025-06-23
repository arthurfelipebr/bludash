import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthContextType, User } from './types'; 
import { APP_NAME, ADMIN_APP_NAME } from './services/AppService';
import { Button, Card, PageTitle, Alert, Spinner, Input } from './components/SharedComponents';


async function apiLogin(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Login failed. Check server logs.' }));
    throw new Error(errorData.message || 'Login failed');
  }
  return response.json();
}

async function apiRegister(email: string, password: string, name?: string, organizationName?: string): Promise<{ token: string; user: User }> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, organizationName }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Registration failed. Check server logs.' }));
    throw new Error(errorData.message || 'Registration failed');
  }
  return response.json();
}

async function apiLogout(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (token) {
    // Example: await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  }
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
}

async function fetchCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const user = await response.json();
      localStorage.setItem('authUser', JSON.stringify(user));
      return user;
    }
    if (response.status === 401 || response.status === 403) {
      console.warn('Auth token expired or invalid. Clearing local data.');
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    return null;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('authUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const verifyUser = async () => {
      setIsAuthLoading(true);
      setAuthError(null);
      const user = await fetchCurrentUser();
      setCurrentUser(user);
      setIsAuthLoading(false);
    };
    verifyUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { token, user } = await apiLogin(email, password);
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error.message || "Falha no login.");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);
  
  const logout = useCallback(async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await apiLogout();
      setCurrentUser(null);
      console.log("Usuário deslogado.");
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError(error.message || "Erro ao sair. Tente novamente.");
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string, organizationName?: string): Promise<User> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { token, user } = await apiRegister(email, password, name, organizationName);
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (error: any) {
      console.error("Registration error:", error);
      setAuthError(error.message || "Falha no registro.");
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isAuthLoading, logout, login, register }}>
      {isAuthLoading && !currentUser && <GlobalSpinner message="Verificando autenticação..." />}
      {authError && !isAuthLoading && !currentUser && (
          <Alert type="warning" message={authError} onClose={() => setAuthError(null)} className="fixed bottom-4 right-4 z-50" />
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface LoginPageProps { adminMode?: boolean }

export const LoginPage: React.FC<LoginPageProps> = ({ adminMode = false }) => {
  const { login, register, isAuthLoading, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const registrationEnabled = !adminMode;
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // For registration
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For registration
  const [pageError, setPageError] = useState<string | null>(null);
  const [attemptingAuth, setAttemptingAuth] = useState(false);

  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [currentUser, isAuthLoading, navigate, location.state]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);

    if (isRegisterMode) {
      if (password !== confirmPassword) {
        setPageError("As senhas não coincidem.");
        return;
      }
      if (password.length < 6) {
        setPageError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
    }
    
    setAttemptingAuth(true);
    try {
      if (isRegisterMode) {
        await register(email, password, name, organizationName);
      } else {
        await login(email, password);
      }
      // Navigation to '/' or 'from' path will be handled by useEffect
    } catch (error: any) {
      setPageError(error.message || (isRegisterMode ? "Falha no registro." : "Falha no login. Verifique suas credenciais."));
    }
    setAttemptingAuth(false);
  };

  if (isAuthLoading && !currentUser) {
      return <GlobalSpinner message="Carregando..." />;
  }

  if (currentUser && !isAuthLoading) { 
      return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <PageTitle
          title={adminMode ? ADMIN_APP_NAME : APP_NAME}
          subtitle={isRegisterMode ? "Criar Nova Conta" : adminMode ? "Acesso Admin" : "Acesso ao Painel Interno"}
          className="text-center mb-6 text-gray-800"
        />
        <img src="https://bluimports.com.br/blu-branco.svg" alt="Blu Imports Logo" className="mx-auto mb-6 h-16 object-contain"/>

        <form onSubmit={handleAuthAction} className="space-y-4">
          {registrationEnabled && isRegisterMode && (
            <Input
              label="Nome (Opcional)"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputClassName="text-lg"
              placeholder="Seu nome"
            />
          )}
          {registrationEnabled && isRegisterMode && (
            <Input
              label="Nome da Empresa"
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              inputClassName="text-lg"
              placeholder="Minha Empresa"
              required
            />
          )}
          <Input
            label="E-mail"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputClassName="text-lg"
            placeholder="seuemail@example.com"
          />
          <Input
            label="Senha"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            inputClassName="text-lg"
            placeholder={isRegisterMode ? "Mínimo 6 caracteres" : "Sua senha"}
          />
          {registrationEnabled && isRegisterMode && (
            <Input
              label="Confirmar Senha"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              inputClassName="text-lg"
              placeholder="Repita a senha"
            />
          )}
          {pageError && <Alert type="error" message={pageError} onClose={() => setPageError(null)} />}
          <Button type="submit" fullWidth isLoading={attemptingAuth} disabled={attemptingAuth}>
            {registrationEnabled && isRegisterMode
              ? attemptingAuth ? 'Registrando...' : 'Criar Conta'
              : attemptingAuth ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        
        {registrationEnabled && (
          <p className="text-sm text-gray-600 mt-6 text-center">
            {isRegisterMode ? (
              <>
                Já tem uma conta?{' '}
                <button onClick={() => { setIsRegisterMode(false); setPageError(null); }} className="font-medium text-blue-600 hover:text-blue-500">
                  Entrar
                </button>
              </>
            ) : (
              <>
                Não tem uma conta?{' '}
                <button onClick={() => { setIsRegisterMode(true); setPageError(null); }} className="font-medium text-blue-600 hover:text-blue-500">
                  Criar conta
                </button>
              </>
            )}
          </p>
        )}
         {!isRegisterMode && (
            <p className="text-xs text-gray-500 mt-3 text-center">
             Esqueceu a senha? Contate o administrador.
            </p>
        )}
      </Card>
    </div>
  );
};

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <GlobalSpinner message="Carregando aplicação..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <GlobalSpinner message="Carregando aplicação..." />;
  }

  if (!currentUser) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AdminLoginPage: React.FC = () => <LoginPage adminMode />;

const GlobalSpinner: React.FC<{message?: string}> = ({message = "Carregando..."}) => (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex flex-col items-center justify-center z-[9999]">
        <Spinner size="lg" />
        <p className="text-white text-lg mt-4">{message}</p>
    </div>
);