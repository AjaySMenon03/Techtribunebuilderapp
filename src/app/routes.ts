import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from './pages/login';
import { AppLayout } from './pages/layout';
import { DashboardPage } from './pages/dashboard';
import { EditorPage } from './pages/editor';
import { ArchivePage } from './pages/archive';
import { SettingsPage } from './pages/settings';
import { ProfileListPage, ProfileEditorPage } from './features/profile-generator';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        loader: () => redirect('/dashboard'),
      },
      {
        path: 'dashboard',
        Component: DashboardPage,
      },
      {
        path: 'editor/:id',
        Component: EditorPage,
      },
      {
        path: 'archive',
        Component: ArchivePage,
      },
      {
        path: 'settings',
        Component: SettingsPage,
      },
      {
        path: 'profile-generator',
        Component: ProfileListPage,
      },
      {
        path: 'profile-generator/editor',
        Component: ProfileEditorPage,
      },
      {
        path: 'profile-generator/:id',
        Component: ProfileEditorPage,
      },
    ],
  },
  {
    path: '*',
    loader: () => redirect('/dashboard'),
  },
]);