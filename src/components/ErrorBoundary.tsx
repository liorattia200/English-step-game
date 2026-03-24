import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'אירעה שגיאה בלתי צפויה.';
      let isPermissionError = false;

      try {
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error?.includes('Missing or insufficient permissions')) {
          errorMessage = 'אין לך הרשאות לבצע פעולה זו. אנא וודא שאתה מחובר לחשבון הנכון.';
          isPermissionError = true;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">אופס! משהו השתבש</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
            >
              <RefreshCw size={20} />
              נסה שוב
            </button>
            {isPermissionError && (
              <p className="mt-4 text-xs text-slate-400">
                אם הבעיה נמשכת, ייתכן שכללי האבטחה של Firebase דורשים עדכון.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
