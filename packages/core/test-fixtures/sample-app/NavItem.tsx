import React, { useContext } from 'react';
import { ThemeContext } from './App';

interface NavItemProps {
  label: string;
  count: number;
}

export function NavItem({ label, count }: NavItemProps) {
  const theme = useContext(ThemeContext);

  return (
    <a className={`nav-item nav-item--${theme}`} href={`#${label.toLowerCase()}`}>
      {label} ({count})
    </a>
  );
}
