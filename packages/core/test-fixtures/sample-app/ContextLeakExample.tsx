import React, { useContext, createContext } from 'react';

// Feature 3: Context Leak Detection
// This demonstrates extracting context values and passing them as props
// instead of children consuming context directly

export const SettingsContext = createContext<{
  theme: string;
  language: string;
  notifications: boolean;
}>({
  theme: 'light',
  language: 'en',
  notifications: true
});

// BAD: This component extracts from context and re-passes as props
export function SettingsPanel() {
  const { theme, language, notifications } = useContext(SettingsContext);

  return (
    <div className="settings-panel">
      {/* Context leak: passing context values as props */}
      <ThemeDisplay currentTheme={theme} />
      <LanguageSelector selectedLanguage={language} />
      <NotificationToggle enabled={notifications} />
    </div>
  );
}

// These children could use useContext(SettingsContext) directly!
function ThemeDisplay({ currentTheme }: { currentTheme: string }) {
  return <div>Current theme: {currentTheme}</div>;
}

function LanguageSelector({ selectedLanguage }: { selectedLanguage: string }) {
  return <select value={selectedLanguage}><option>{selectedLanguage}</option></select>;
}

function NotificationToggle({ enabled }: { enabled: boolean }) {
  return <input type="checkbox" checked={enabled} />;
}
