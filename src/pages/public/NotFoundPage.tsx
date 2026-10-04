import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Lock } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-700">
        <Lock className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mb-6">
        The link you followed may be broken or the resource page does not exist.
      </p>
      <Link to="/">
        <Button variant="primary" size="sm">
          Return to Home
        </Button>
      </Link>
    </div>
  );
};
