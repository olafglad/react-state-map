import React, { useContext } from 'react';
import { ThemeContext } from './App';
import { NavBar } from './NavBar';

interface HeaderProps {
  title: string;
  count: number;
  onToggleTheme: () => void;
}

export function Header({ title, count, onToggleTheme }: HeaderProps) {
  const theme = useContext(ThemeContext);

  return (
    <header className={`header header--${theme}`}>
      <h1>{title}</h1>
      <NavBar count={count} />
      <button onClick={onToggleTheme}>Toggle Theme</button>
    </header>
  );
}
