import { createContext, PropsWithChildren, use, useState } from 'react';
import { useNavigate } from 'react-router';

type AuthContextValue = {
  isLogin: boolean;
  login(): void;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);

  const login = () => {
    setIsLogin(true);
    navigate('/home');
  };

  const logout = () => {
    setIsLogin(false);
  };

  const value: AuthContextValue = {
    isLogin,
    login,
    logout,
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthentication(): AuthContextValue {
  return use(AuthContext);
}
