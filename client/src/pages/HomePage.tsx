import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HomePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to MERN Blog</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          A full-stack blog application built with MongoDB, Express, React, and Node.js.
        </p>
        <div className="space-x-4">
          <Button asChild size="lg">
            <Link to="/posts">Browse Posts</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/categories">View Categories</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
