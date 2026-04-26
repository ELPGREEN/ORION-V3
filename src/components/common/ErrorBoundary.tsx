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
    try {
      (window as any).__lastBoundaryError = { error, errorInfo, time: new Date().toISOString() };
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const message = err?.message || String(err || "Erro desconhecido");
      const stack = err?.stack || "";
      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
          <div className="text-center p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-serif mb-4">Algo deu errado</h2>
            <p className="text-muted-foreground mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <details className="text-left bg-muted/30 border border-border rounded p-3 mb-4 text-xs">
              <summary className="cursor-pointer font-mono mb-2">Detalhes técnicos</summary>
              <p className="font-mono text-destructive break-all mb-2">{message}</p>
              {stack && (
                <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground max-h-60 overflow-auto">
                  {stack}
                </pre>
              )}
            </details>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
              >
                Recarregar Página
              </button>
              <button 
                onClick={() => { this.setState({ hasError: false, error: null }); }} 
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
