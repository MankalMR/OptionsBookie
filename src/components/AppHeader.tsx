'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, BarChart2, LineChart, Layers } from 'lucide-react';
import UserMenu from '@/components/UserMenu';

const NAV_ITEMS = [
  { label: 'Trading Desk',     href: '/',            icon: Layers,    exact: true  },
  { label: 'ETF Intelligence', href: '/etfs',         icon: BarChart2, exact: false },
  { label: 'COT Signals',      href: '/cot-analysis', icon: LineChart, exact: false },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click — same pattern as UserMenu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (href: string, exact: boolean) => {
    if (!pathname) return false;
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/images/OptionBookie1.png"
              alt="OptionsBookie Logo"
              className="h-10 w-10 object-contain"
            />
            <div>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                OptionsBookie
              </span>
              <p className="hidden md:block text-[10px] text-muted-foreground leading-none mt-0.5">
                Track your options trades with precision
              </p>
            </div>
          </Link>

          {/* Centre: Desktop inline nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-600/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Right: UserMenu + mobile hamburger */}
          <div className="flex items-center gap-2">
            <UserMenu />

            {/* Hamburger — mobile only, floating dropdown matching UserMenu style */}
            <div ref={menuRef} className="md:hidden relative">
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={() => setMenuOpen(prev => !prev)}
                aria-label="Toggle navigation"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {/* Floating card — overlays content, does NOT push page down */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white dark:bg-neutral-900 shadow-2xl ring-1 ring-foreground/5 z-[100] overflow-hidden">
                  <div className="py-1.5">
                    {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
                      const active = isActive(href, exact);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-600/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                          {active && <span className="ml-auto h-2 w-2 rounded-full bg-blue-500" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
