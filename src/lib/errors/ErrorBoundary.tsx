import { Component, type ReactNode, type ErrorInfo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { generateCorrelationId } from "./index";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  correlationId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, correlationId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, correlationId: generateCorrelationId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary][${this.state.correlationId}] Component crashed:`, {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      correlationId: this.state.correlationId,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, correlationId: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {this.props.fallbackTitle || "Algo deu errado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message || "Ocorreu um erro inesperado."}
            </p>
            {this.state.correlationId && (
              <p className="text-[10px] opacity-50 font-mono">
                ID: {this.state.correlationId}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={this.handleReset}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
