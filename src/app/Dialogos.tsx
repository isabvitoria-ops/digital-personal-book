import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Perguntas rápidas (nome de uma área, endereço de um link) e confirmações
 * ("apagar para sempre?") num só lugar, com a cara do app — o `prompt()` do
 * navegador é feio e, no iPhone instalado, às vezes nem aparece.
 */
interface PedidoTexto {
  tipo: "texto";
  titulo: string;
  rotulo?: string;
  valor?: string;
  placeholder?: string;
  confirmar?: string;
  resolver: (v: string | null) => void;
}
interface PedidoConfirmacao {
  tipo: "confirmar";
  titulo: string;
  texto?: string;
  confirmar?: string;
  perigo?: boolean;
  resolver: (v: boolean) => void;
}
type Pedido = PedidoTexto | PedidoConfirmacao;

interface Api {
  perguntar: (o: Omit<PedidoTexto, "tipo" | "resolver">) => Promise<string | null>;
  confirmar: (o: Omit<PedidoConfirmacao, "tipo" | "resolver">) => Promise<boolean>;
  avisar: (texto: string) => void;
}

const Contexto = createContext<Api | null>(null);

export function ProvedorDeDialogos({ children }: { children: ReactNode }) {
  const [pedido, definirPedido] = useState<Pedido | null>(null);
  const [aviso, definirAviso] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const perguntar = useCallback<Api["perguntar"]>(
    (o) => new Promise((resolver) => definirPedido({ ...o, tipo: "texto", resolver })),
    [],
  );
  const confirmar = useCallback<Api["confirmar"]>(
    (o) => new Promise((resolver) => definirPedido({ ...o, tipo: "confirmar", resolver })),
    [],
  );
  const avisar = useCallback((texto: string) => {
    definirAviso(texto);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => definirAviso(null), 2800);
  }, []);

  return (
    <Contexto.Provider value={{ perguntar, confirmar, avisar }}>
      {children}
      {pedido && <Dialogo pedido={pedido} fechar={() => definirPedido(null)} />}
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
    </Contexto.Provider>
  );
}

function Dialogo({ pedido, fechar }: { pedido: Pedido; fechar: () => void }) {
  const [valor, definirValor] = useState(pedido.tipo === "texto" ? (pedido.valor ?? "") : "");
  const campo = useRef<HTMLInputElement>(null);

  const cancelar = useCallback(() => {
    if (pedido.tipo === "texto") pedido.resolver(null);
    else pedido.resolver(false);
    fechar();
  }, [pedido, fechar]);

  function ok() {
    if (pedido.tipo === "texto") {
      if (!valor.trim()) return;
      pedido.resolver(valor.trim());
    } else pedido.resolver(true);
    fechar();
  }

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cancelar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [cancelar]);

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && cancelar()}>
      <form
        className="modal modal-pequeno"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
      >
        <h2 id="dialogo-titulo" className="modal-titulo">
          {pedido.titulo}
        </h2>
        {pedido.tipo === "confirmar" && pedido.texto && <p className="modal-texto">{pedido.texto}</p>}
        {pedido.tipo === "texto" && (
          <label className="campo">
            {pedido.rotulo && <span className="campo-rotulo">{pedido.rotulo}</span>}
            <input
              ref={campo}
              value={valor}
              placeholder={pedido.placeholder}
              onChange={(e) => definirValor(e.target.value)}
            />
          </label>
        )}
        <div className="modal-botoes">
          <button type="button" className="botao botao-leve" onClick={cancelar}>
            Cancelar
          </button>
          <button
            type="submit"
            className={pedido.tipo === "confirmar" && pedido.perigo ? "botao botao-perigo" : "botao botao-principal"}
          >
            {pedido.confirmar ?? "OK"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function useDialogos(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error("useDialogos fora do ProvedorDeDialogos");
  return api;
}
