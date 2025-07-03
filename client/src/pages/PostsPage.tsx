import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useGet } from '@/hooks/useApi';
import { Loader2, RefreshCw, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

type Category = {
  _id: string;
  name: string;
};

type Author = {
  _id: string;
  name: string;
  email: string;
};

type Post = {
  _id: string;
  title: string;
  content: string;
  categories: Category[] | string[];
  author: Author | string;
  createdAt: string;
  updatedAt: string;
};

interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    next?: { page: number; limit: number };
    prev?: { page: number; limit: number };
  };
  count: number;
}

const PostsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [posts, setPosts] = useState<Post[]>([]);
  
  const {
    data: _,
    isLoading,
    isError,
    error,
    refetch
  } = useGet<PostsResponse>(`/posts?page=${currentPage}`, {
    onError: (err) => {
      console.error('Error fetching posts:', err);
    },
    onSuccess: (data) => {
      if (data) {
        setPosts(data.data || []);
        setTotalPages(Math.ceil((data.count || 0) / 10));
      }
    }
  });
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          Error: {error?.message || 'Failed to load posts'}
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Posts</h1>
        <Button asChild>
          <Link to="/posts/create">Create Post</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground text-lg">No posts found.</p>
          <Button className="mt-4" asChild>
            <Link to="/posts/create">Create your first post</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const authorName = typeof post.author === 'string' ? 'Unknown' : post.author?.name || 'Unknown';
              
              return (
                <article key={post._id} className="border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow duration-300">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 line-clamp-2">{post.title}</h2>
                    
                    <div className="flex items-center text-sm text-muted-foreground mb-4 space-x-4">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>{authorName}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <time dateTime={post.createdAt}>
                          {format(new Date(post.createdAt), 'MMM d, yyyy')}
                        </time>
                      </div>
                    </div>
                    
                    <p className="text-foreground mb-4 line-clamp-3">
                      {post.content?.substring(0, 200)}{post.content?.length > 200 ? '...' : ''}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Array.isArray(post.categories) && post.categories.map((cat) => (
                        <span 
                          key={typeof cat === 'string' ? cat : cat._id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {typeof cat === 'string' ? cat : cat.name}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/posts/${post._id}`}>
                          Read more
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostsPage;
