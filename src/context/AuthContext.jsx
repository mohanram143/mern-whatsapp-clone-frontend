import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../api/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const storedToken = authService.getToken();
      const storedUser = authService.getStoredUser();
      if (storedToken && storedUser) {
        const valid = await authService.verifyToken();
        if (valid) {
          setToken(storedToken);
          setCurrentUser(storedUser);
          // refresh profile in the background in case avatar/name changed elsewhere
          authService
            .getMyProfile()
            .then((profile) => {
              const updated = authService.updateStoredUser(profile);
              setCurrentUser(updated);
            })
            .catch(() => {});
        } else {
          authService.clearSession();
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password);
    const user = {
      username: data.username || username,
      avatar: data.avatar || "",
      about: data.about || "",
    };
    authService.saveSession(data.token, user);
    setToken(data.token);
    setCurrentUser(user);
    return data;
  }, []);

  const register = useCallback(async (username, password) => {
    return authService.register(username, password);
  }, []);

  const logout = useCallback(() => {
    authService.clearSession();
    setToken(null);
    setCurrentUser(null);
  }, []);

  // Merge a profile patch (e.g. after editing name/about/avatar) into
  // both React state and localStorage so it survives a refresh.
  const updateProfile = useCallback((patch) => {
    const updated = authService.updateStoredUser(patch);
    setCurrentUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        isAuthenticated: Boolean(token && currentUser),
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export default AuthContext;
