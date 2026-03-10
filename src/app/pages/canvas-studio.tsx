import { CanvasProjectsList } from '../features/canvas-studio';
import { ErrorBoundary } from '../components/error-boundary';

export function CanvasStudioPage() {
  return (
    <ErrorBoundary
      fallbackTitle="Canvas Studio Error"
      fallbackMessage="Canvas Studio encountered an error. Try refreshing the page."
    >
      <div className="h-full w-full">
        <CanvasProjectsList />
      </div>
    </ErrorBoundary>
  );
}
