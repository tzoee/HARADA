'use client';

import { Settings, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchBar } from '@/components/search-bar';
import { signOut } from '@/app/actions/auth';
import { useUIStore } from '@/store/ui-store';
import Link from 'next/link';

export function TopBar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between gap-4">
      {/* Left side - Menu button (mobile) and Search */}
      <div className="flex items-center gap-3 flex-1">
        {sidebarCollapsed && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <SearchBar className="max-w-md flex-1" />
      </div>

      {/* Right side - Toggles and User Menu */}
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
