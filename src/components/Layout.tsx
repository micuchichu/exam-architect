import { Link, useLocation } from 'react-router-dom';
import { BookOpen, PlusCircle, FileText, FolderUp, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const publicNavItems = [
  { to: '/', label: 'Question Bank', icon: BookOpen },
  { to: '/exams', label: 'Exams', icon: FileText },
];

const adminNavItems = [
  { to: '/add', label: 'Add Question', icon: PlusCircle },
  { to: '/upload', label: 'Upload Folder', icon: FolderUp },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { isAdmin, user, signOut } = useAuth();

  const navItems = isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-sm">
              EG
            </div>
            <span className="text-lg font-bold tracking-tight">Exam Generator</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === to
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <ThemeToggle />
            {user ? (
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LogIn className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
