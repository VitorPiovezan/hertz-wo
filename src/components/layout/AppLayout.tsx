'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  Package,
  PackageCheck,
  BarChart3,
  Menu,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { useThemeStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/', label: 'Início', icon: LayoutDashboard },
  { href: '/ordens', label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/cobrancas', label: 'Cobranças', icon: CreditCard },
  { href: '/concluidos', label: 'Serviços Concluídos', icon: PackageCheck },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: (typeof NAV_ITEMS)[0] & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <Link
        href="/"
        onClick={onNavigate}
        className="block px-4 py-5 border-b border-sidebar-border transition-colors hover:bg-sidebar-accent"
      >
        <BrandLogo className="h-7" />
        <p className="text-xs text-muted-foreground mt-1.5">Ordens de Serviço</p>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.href} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header + Drawer */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b bg-sidebar">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-6" />
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
