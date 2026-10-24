import React from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("P2Care Screen Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 text-center text-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <AlertCircle size={32} />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Screen temporarily unavailable
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            We encountered a problem loading this screen. Your account and session remain completely safe.
          </p>

          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
            >
              <Home size={18} />
              Return to Home
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <RotateCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
