import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AuthGuard } from '../components/auth-guard';
import { SidebarNav } from '../components/sidebar-nav';
import { ErrorBoundary } from '../components/error-boundary';
import { useAuthStore, useWorkspaceStore } from '../store';
import { DEFAULT_THEME } from '../lib/types';

export function AppLayout() {
  const { user } = useAuthStore();
  const { fetch: fetchWorkspace, workspace } = useWorkspaceStore();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetchWorkspace();
    }
  }, [user, fetchWorkspace]);

  // Persist dark mode across navigation
  useEffect(() => {
    const wsTheme = workspace.theme || DEFAULT_THEME;
    if (wsTheme.dark_mode_enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [workspace.theme]);

  // Editor pages get their own full-width layout (no sidebar)
  const isEditorPage = location.pathname.startsWith('/editor/') || location.pathname.startsWith('/profile-generator/editor');

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <SidebarNav />
        <main className="flex-1 overflow-auto min-w-0">
          {/* On mobile non-editor pages, add top padding for the hamburger button */}
          <div className={isEditorPage ? 'h-full' : 'h-full md:pt-0 pt-14'}>
            <ErrorBoundary
              fallbackTitle="Page Error"
              fallbackMessage="This page encountered an error. Try navigating back or refreshing."
            >
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}