import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NavItem } from '../types';

export interface SidebarItem extends NavItem {
  exact?: boolean;
}

interface SidebarLayoutProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  items: SidebarItem[];
  title?: string;
  logo?: string;
  logoutFn: () => Promise<void> | void;
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ isOpen, setIsOpen, items, title, logo, logoutFn }) => {
  const location = useLocation();

  const NavLink: React.FC<{ item: SidebarItem }> = ({ item }) => {
    const isActive = item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path) &&
        (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
    const IconComponent = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => setIsOpen(false)}
        className={`flex items-center px-3 py-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blu-accent text-blu-primary' : 'text-white hover:bg-white/10'}`}
      >
        <IconComponent className="h-6 w-6 mr-3 flex-shrink-0" />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-blu-primary text-white shadow-lg border-r border-blu-accent transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-20 border-b border-blu-accent/50 px-4">
          {logo && <img src={logo} alt={title || 'Logo'} className="h-10 object-contain" />}
          {title && <span className="text-lg font-semibold">{title}</span>}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-blu-accent/50">
          <button
            onClick={async () => {
              await logoutFn();
              setIsOpen(false);
            }}
            className="flex items-center w-full px-3 py-3 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-6 w-6 mr-3 flex-shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
