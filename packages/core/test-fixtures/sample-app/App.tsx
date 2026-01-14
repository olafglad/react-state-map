import React, { useState, useContext, createContext } from 'react';
import { Header } from './Header';
import { UserProfile } from './UserProfile';
import { FormSection } from './FormSection';
import { SettingsPanel, SettingsContext } from './ContextLeakExample';
import { DealContainer } from './RenameExample';

export const ThemeContext = createContext<'light' | 'dark'>('light');
export const UserContext = createContext<{ name: string } | null>(null);

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [count, setCount] = useState(0);
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    address: '123 Main St',
    city: 'Springfield',
    zipCode: '12345'
  });
  const [deal] = useState({ id: 1, name: 'Big Deal', value: 10000, status: 'pending' });

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <SettingsContext.Provider value={{ theme, language: 'en', notifications: true }}>
          <div className="app">
            <Header title="My App" count={count} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
            <main>
              <UserProfile user={user} setUser={setUser} />
              <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>

              {/* Feature 2: Bundle Detection */}
              <FormSection
                formData={formData}
                onUpdate={(updates) => setFormData(f => ({ ...f, ...updates }))}
              />

              {/* Feature 3: Context Leak Detection */}
              <SettingsPanel />

              {/* Feature 4: Rename Tracking */}
              <DealContainer dealInfoForm={deal} />
            </main>
          </div>
        </SettingsContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
