import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import HomePage from '@/pages/HomePage';
import PostsPage from '@/pages/PostsPage';
import CreatePostPage from '@/pages/CreatePostPage';
import CategoriesPage from '@/pages/CategoriesPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="posts" element={<PostsPage />} />
            
            {/* Protected admin routes */}
            <Route element={
              <ProtectedRoute requiredRole="admin">
                <Outlet />
              </ProtectedRoute>
            }>
              <Route path="posts/create" element={<CreatePostPage />} />
              <Route path="categories" element={<CategoriesPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </Router>
  );
}
