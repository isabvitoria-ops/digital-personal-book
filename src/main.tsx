import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { pedirArmazenamentoPersistente } from "./dados/banco";
import "./estilo.css";

// Funciona sem internet: o app fica guardado no aparelho e se atualiza
// sozinho quando houver versão nova.
registerSW({ immediate: true });
void pedirArmazenamentoPersistente();

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
