import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[ErrorBoundary] caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-serif mb-4">Algo deu errado</h2>
            <p className="text-muted-foreground mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <p className="text-xs text-muted-foreground mb-6">
              Se o problema persistir, entre em contato com o suporte.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
