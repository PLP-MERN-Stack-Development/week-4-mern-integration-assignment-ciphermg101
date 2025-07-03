import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useGet } from '@/hooks/useApi';
import { Loader2, RefreshCw } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  description: string;
  slug: string;
  createdAt: string;
  postCount?: number;
}

const CategoriesPage = () => {
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch
  } = useGet<Category[]>('/categories', {
    onError: (err) => {
      console.error('Error fetching categories:', err);
    }
  });
  
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          Error: {error?.message || 'Failed to load categories'}
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-2">
            Browse posts by category
          </p>
        </div>
        <Button asChild>
          <Link to="/categories/new">Create Category</Link>
        </Button>
      </div>

      {safeCategories.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
          <p className="text-lg text-muted-foreground mb-4">No categories found.</p>
          <Button asChild>
            <Link to="/categories/new">Create your first category</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {safeCategories.map((category) => (
            <Link 
              to={`/categories/${category.slug || category._id}`} 
              key={category._id}
              className="group"
            >
              <div className="h-full border rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 bg-card">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  {category.postCount !== undefined && (
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {category.postCount} {category.postCount === 1 ? 'post' : 'posts'}
                    </span>
                  )}
                </div>
                
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {category.description || 'No description available.'}
                </p>
                
                <div className="text-sm text-muted-foreground mt-4 pt-3 border-t">
                  Created {new Date(category.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
