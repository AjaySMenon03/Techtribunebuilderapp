import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { useAuthStore, useWorkspaceStore } from '../store';
import {
  LayoutDashboard,
  Archive,
  Settings,
  LogOut,
  Newspaper,
  Menu,
  X,
  IdCard,
  PenTool,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useIsMobile } from './ui/use-mobile';

const navItems = [
  { to: '/dashboard', label: 'Newsletter', icon: Newspaper },
  { to: '/profile-generator', label: 'Profile Generator', icon: IdCard },
  { to: '/canvas-studio', label: 'Canvas Studio', icon: PenTool },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function SidebarNav() {
  const { user, signOut } = useAuthStore();
  const { workspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide sidebar entirely on editor pages
  const isEditorPage = location.pathname.startsWith('/editor/') || location.pathname.startsWith('/profile-generator/editor');
  if (isEditorPage) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          {workspace.logo_url ? (
            <ImageWithFallback
              src={workspace.logo_url}
              alt="Logo"
              className="w-9 h-9 rounded-lg object-contain"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{workspace.name || 'Tech Tribune'}</h2>
            <p className="text-xs text-muted-foreground truncate">Newsletter Builder</p>
          </div>
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => isMobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  // Mobile: hamburger + overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-card border border-border shadow-sm text-muted-foreground hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col z-50 animate-in slide-in-from-left duration-200">
              {sidebarContent}
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop: normal fixed sidebar
  return (
    <aside className="w-56 lg:w-64 h-screen bg-card border-r border-border flex flex-col shrink-0 hidden md:flex">
      {sidebarContent}
    </aside>
  );
}