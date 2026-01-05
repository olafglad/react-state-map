import React from 'react';
import { NavItem } from './NavItem';

interface NavBarProps {
  count: number;
}

export function NavBar({ count }: NavBarProps) {
  return (
    <nav>
      <NavItem label="Home" count={count} />
      <NavItem label="About" count={count} />
      <NavItem label="Contact" count={count} />
    </nav>
  );
}
