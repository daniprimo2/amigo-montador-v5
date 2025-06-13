import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Tratamento global de erros não capturados
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Promise rejeitada não tratada:', event.reason);
  // Só previne erros relacionados a fetch/network que não afetam a UI
  if (event.reason?.message?.includes('Failed to fetch') || 
      event.reason?.message?.includes('NetworkError') ||
      event.reason?.message?.includes('fetch')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  console.warn('Erro global capturado:', event.error);
  // Log detalhado para debugging
  if (event.error?.stack) {
    console.error('Stack trace:', event.error.stack);
  }
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
