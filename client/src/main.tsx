import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Tratamento global de erros não capturados
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Promise rejeitada não tratada:', event.reason);
  // Previne que o erro apareça no console como não tratado
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.warn('Erro global capturado:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
