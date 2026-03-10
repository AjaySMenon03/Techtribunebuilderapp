import { useParams } from 'react-router';
import { CanvasStudio } from '../features/canvas-studio';
import { ErrorBoundary } from '../components/error-boundary';

export function CanvasStudioEditorPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ErrorBoundary
      fallbackTitle="Canvas Studio Error"
      fallbackMessage="Canvas Studio encountered an error. Try refreshing the page."
    >
      <div className="h-full w-full">
        <CanvasStudio projectId={id} />
      </div>
    </ErrorBoundary>
  );
}
