import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function MinimalComponent() {
  console.log("MinimalComponent rendering");
  return <div>Minimal Test</div>;
}

export default function App() {
  console.log("App rendering");
  return (
    <QueryClientProvider client={queryClient}>
      <MinimalComponent />
    </QueryClientProvider>
  );
}