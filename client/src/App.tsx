import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Absolutely minimal component with no dependencies
const MinimalComponent = () => {
  console.log("MinimalComponent rendering - no context usage");
  return <div>Minimal Test</div>;
};

// Add error boundary to catch any context errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error);
    console.error("Error info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Error: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

export default function App() {
  console.log("App rendering - QueryClient instantiation");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MinimalComponent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}