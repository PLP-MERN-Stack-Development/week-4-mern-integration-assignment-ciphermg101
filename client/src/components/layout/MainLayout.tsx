import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MERN Blog</h1>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Button asChild variant="ghost">
                  <Link to="/">Home</Link>
                </Button>
              </li>
              <li>
                <Button asChild variant="ghost">
                  <Link to="/posts">Posts</Link>
                </Button>
              </li>
              <li>
                <Button asChild variant="ghost">
                  <Link to="/categories">Categories</Link>
                </Button>
              </li>
              {isAuthenticated ? (
                <li className="flex items-center ml-4">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-1" />
                      {user?.name || user?.email}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </Button>
                  </div>
                </li>
              ) : (
                <li>
                  <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                  </Button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      
      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {new Date().getFullYear()} MERN Blog. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
