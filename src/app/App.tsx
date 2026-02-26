import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useAuthStore } from './store';
import { Toaster } from 'sonner';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="size-full">
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
