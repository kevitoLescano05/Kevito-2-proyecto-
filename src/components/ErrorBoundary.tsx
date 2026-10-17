import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleResetState = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              Se recuperó la aplicación
            </h1>
            <p className="text-sm text-slate-300 mb-6">
              Ocurrió una interrupción temporal en la vista. Tus datos guardados están completamente seguros y protegidos.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 text-xs text-rose-300">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                  Ver detalle técnico
                </summary>
                <pre className="mt-2 text-[11px] overflow-auto whitespace-pre-wrap font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleResetState}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Continuar usando la app
              </button>
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition text-xs cursor-pointer"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
