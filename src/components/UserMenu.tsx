'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogOut, Settings, Loader2, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (status === 'loading') {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Sign in
      </button>
    );
  }

  const initials = session.user?.name
    ? session.user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : session.user?.email?.[0].toUpperCase() ?? '?';

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-7 w-7 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <span className="h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center">
            {initials}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white dark:bg-neutral-900 shadow-2xl ring-1 ring-foreground/5 z-[100] overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">
              {session.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {session.user?.email}
            </p>
          </div>

          {/* Actions */}
          <div className="py-1.5">
            <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Theme
              </span>
              <ThemeToggle />
            </div>

            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
