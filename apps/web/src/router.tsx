import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/public/HomePage';
import { ContactPage } from './pages/public/ContactPage';
import { SharePage } from './pages/public/SharePage';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AlbumsPage } from './pages/admin/AlbumsPage';
import { AlbumPhotosPage } from './pages/admin/AlbumPhotosPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { MessagesPage } from './pages/admin/MessagesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'share/:token', element: <SharePage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/albums" replace /> },
      { path: 'albums', element: <AlbumsPage /> },
      { path: 'albums/:id', element: <AlbumPhotosPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'messages', element: <MessagesPage /> },
    ],
  },
]);
