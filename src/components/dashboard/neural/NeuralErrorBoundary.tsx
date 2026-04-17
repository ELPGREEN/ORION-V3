import { Component, Suspense, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function SuspenseFallback() {
  return (
    <Card className="border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-[hsl(var(--tron-bg-deep))]/50">
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-xs text-muted-foreground">Carregando módulo…</span>
      </CardContent>
    </Card>
  );
}

export class NeuralErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("🧠 [NeuralErrorBoundary] Component crashed:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {this.props.fallbackTitle || "Erro ao carregar componente"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || "Ocorreu um erro inesperado."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Suspense fallback={<SuspenseFallback />}>
        {this.props.children}
      </Suspense>
    );
  }
}
