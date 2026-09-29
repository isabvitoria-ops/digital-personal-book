import { useEffect, useMemo, useRef, useState } from "react";
import { caminhoDaPagina, useDados } from "../app/Dados";
import { normalizar, tituloVisivel } from "../util/texto";
import { Icone } from "./Icone";

export interface PaginaEscolhida {
  id: string;
  titulo: string;
  nova: boolean;
}

/**
 * A janela do [[ : procura uma página pelo título e devolve qual foi. Se não
 * existir, oferece criar — o link já nasce apontando para a página nova, que
 * fica na Inbox esperando ser escrita.
 */
export function EscolherPagina({
  ignorar,
  aoEscolher,
  aoFechar,
}: {
  ignorar?: string;
  aoEscolher: (p: PaginaEscolhida) => void;
  aoFechar: () => void;
}) {
  const dados = useDados();
  const [busca, definirBusca] = useState("");
  const [marcada, definirMarcada] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => campo.current?.focus(), []);

  const opcoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    return dados.vivas
      .filter((p) => p.id !== ignorar)
      .map((p) => ({ p, titulo: tituloVisivel(p.titulo, p.conteudo) }))
      .filter(({ titulo }) => !termo || normalizar(titulo).includes(termo))
      .sort((a, b) => {
        // Quem começa com o que ela digitou vem antes; depois, o mais recente.
        const ca = normalizar(a.titulo).startsWith(termo) ? 0 : 1;
        const cb = normalizar(b.titulo).startsWith(termo) ? 0 : 1;
        return ca - cb || (b.p.abertaEm ?? b.p.atualizadaEm).localeCompare(a.p.abertaEm ?? a.p.atualizadaEm);
      })
      .slice(0, 30);
  }, [busca, dados.vivas, ignorar]);

  const podeCriar = busca.trim().length > 0 && !opcoes.some((o) => normalizar(o.titulo) === normalizar(busca.trim()));
  const total = opcoes.length + (podeCriar ? 1 : 0);

  function escolher(i: number) {
    const o = opcoes[i];
    if (o) aoEscolher({ id: o.p.id, titulo: o.titulo, nova: false });
    else if (podeCriar) aoEscolher({ id: "", titulo: busca.trim(), nova: true });
  }

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Citar outra página">
        <div className="modal-cabeca">
          <h2 className="modal-titulo">Citar outra página</h2>
          <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        <input
          ref={campo}
          className="campo-busca"
          placeholder="Nome da página…"
          value={busca}
          onChange={(e) => {
            definirBusca(e.target.value);
            definirMarcada(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              definirMarcada((m) => Math.min(total - 1, m + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              definirMarcada((m) => Math.max(0, m - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              escolher(marcada);
            } else if (e.key === "Escape") aoFechar();
          }}
        />
        <ul className="lista-escolha" role="listbox">
          {opcoes.map(({ p, titulo }, i) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === marcada}
                className="opcao-escolha"
                onClick={() => escolher(i)}
              >
                <span className="opcao-titulo">{titulo}</span>
                <span className="opcao-caminho">{caminhoDaPagina(p, dados).join(" › ")}</span>
              </button>
            </li>
          ))}
          {podeCriar && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={marcada === opcoes.length}
                className="opcao-escolha opcao-criar"
                onClick={() => escolher(opcoes.length)}
              >
                <span className="opcao-titulo">
                  <Icone nome="mais" tamanho={16} /> Criar “{busca.trim()}”
                </span>
                <span className="opcao-caminho">Página nova, na Inbox</span>
              </button>
            </li>
          )}
          {total === 0 && <li className="vazio-pequeno">Nenhuma página ainda.</li>}
        </ul>
      </div>
    </div>
  );
}
