import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { AvisoDeNavegador } from "./app/AvisoDeNavegador";
import { db, pedirArmazenamentoPersistente } from "./dados/banco";
import "./estilo.css";

// Funciona sem internet: o app fica guardado no aparelho e se atualiza
// sozinho quando houver versão nova.
registerSW({ immediate: true });
void pedirArmazenamentoPersistente();

const raiz = createRoot(document.getElementById("raiz")!);

// Antes de mostrar o app, confere que o navegador deixa guardar dados. Se não
// deixar, avisa com todas as letras em vez de abrir uma tela em branco.
db.open().then(
  () =>
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  (erro: unknown) =>
    raiz.render(<AvisoDeNavegador detalhe={erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro)} />),
);
