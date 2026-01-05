// Custom hook example
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check
    setTimeout(() => {
      setUser({ id: '1', name: 'John' });
      setLoading(false);
    }, 100);
  }, []);

  const login = (userData: { id: string; name: string }) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return { user, loading, login, logout };
}
