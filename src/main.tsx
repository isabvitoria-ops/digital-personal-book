import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { AvisoDeNavegador, SeAlgoQuebrar, type Motivo } from "./app/AvisoDeNavegador";
import { db, pedirArmazenamentoPersistente } from "./dados/banco";
import "./estilo.css";

// Funciona sem internet: o app fica guardado no aparelho e se atualiza
// sozinho quando houver versão nova.
registerSW({ immediate: true });
void pedirArmazenamentoPersistente();

const raiz = createRoot(document.getElementById("raiz")!);

function avisar(motivo: Motivo, detalhe: string) {
  raiz.render(<AvisoDeNavegador motivo={motivo} detalhe={detalhe} />);
}

// Antes de mostrar o app, confere que o navegador deixa guardar dados. Nunca
// deixa a tela em branco: falha, trava por outra aba ou demora demais viram um
// aviso com o que fazer.
const ESPERA_MAXIMA_MS = 8000;
let mostrouAlgo = false;

db.on("blocked", () => {
  if (!mostrouAlgo) {
    mostrouAlgo = true;
    avisar("outra-aba", "a abertura do banco ficou bloqueada por outra aba");
  }
});

const espera = setTimeout(() => {
  if (!mostrouAlgo) {
    mostrouAlgo = true;
    avisar("outra-aba", `o banco não abriu em ${ESPERA_MAXIMA_MS / 1000} segundos`);
  }
}, ESPERA_MAXIMA_MS);

db.open().then(
  () => {
    clearTimeout(espera);
    if (mostrouAlgo) return;
    mostrouAlgo = true;
    raiz.render(
      <StrictMode>
        <SeAlgoQuebrar>
          <App />
        </SeAlgoQuebrar>
      </StrictMode>,
    );
  },
  (erro: unknown) => {
    clearTimeout(espera);
    if (mostrouAlgo) return;
    mostrouAlgo = true;
    avisar("armazenamento", erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro));
  },
);
