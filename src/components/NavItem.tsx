import React from 'react';
import { Link } from 'react-router-dom';

export type NavItemProps = {
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
};

const NavItemComponent: React.FC<NavItemProps> = ({
  label,
  href,
  isActive = false,
  onClick,
}) => {
  const className = `nav-item${isActive ? ' nav-item--active' : ''}`;

  return (
    <Link to={href} className={className} onClick={onClick} aria-current={isActive ? 'page' : undefined}>
      {label}
    </Link>
  );
};

export const NavItem = React.memo(NavItemComponent);
