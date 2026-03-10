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
  const isCanvasEditor = /^\/canvas-studio\/[^/]+/.test(location.pathname);
  const isCanvasPage = location.pathname === '/canvas-studio';
  const isFullPage = isEditorPage || isCanvasPage || isCanvasEditor;

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {!isCanvasEditor && <SidebarNav />}
        <main className={`flex-1 min-w-0 ${(isCanvasPage || isCanvasEditor) ? 'overflow-hidden' : 'overflow-auto'}`}>
          {/* On mobile non-editor pages, add top padding for the hamburger button */}
          <div className={isFullPage ? 'h-full' : 'h-full md:pt-0 pt-14'}>
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