import React, { useState, useContext, createContext } from 'react';
import { Header } from './Header';
import { UserProfile } from './UserProfile';

export const ThemeContext = createContext<'light' | 'dark'>('light');
export const UserContext = createContext<{ name: string } | null>(null);

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [count, setCount] = useState(0);

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <div className="app">
          <Header title="My App" count={count} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
          <main>
            <UserProfile user={user} setUser={setUser} />
            <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
          </main>
        </div>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
