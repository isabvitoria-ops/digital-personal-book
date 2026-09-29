import { useDados } from "../app/Dados";
import type { Id } from "../dados/tipos";
import { Icone } from "./Icone";

/**
 * "Mover para…": a organização acontece aqui, em dois toques, depois de
 * escrever — nunca como condição para começar.
 */
export function MoverPara({
  atual,
  aoEscolher,
  aoFechar,
}: {
  atual: { cadernoId: Id | null; secaoId: Id | null };
  aoEscolher: (cadernoId: Id | null, secaoId: Id | null) => void;
  aoFechar: () => void;
}) {
  const { areas, cadernos } = useDados();
  const eAqui = (c: Id | null, s: Id | null) => atual.cadernoId === c && atual.secaoId === s;

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Mover para">
        <div className="modal-cabeca">
          <h2 className="modal-titulo">Mover para…</h2>
          <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        <div className="lista-mover">
          <button type="button" className="destino" disabled={eAqui(null, null)} onClick={() => aoEscolher(null, null)}>
            <Icone nome="inbox" tamanho={18} /> Inbox
          </button>
          {areas
            .filter((a) => !a.arquivada)
            .map((area) => {
              const dela = cadernos.filter((c) => c.areaId === area.id && !c.arquivado);
              if (dela.length === 0) return null;
              return (
                <div key={area.id} className="grupo-mover">
                  <p className="grupo-mover-nome">{area.nome}</p>
                  {dela.map((c) => (
                    <div key={c.id}>
                      <button type="button" className="destino" disabled={eAqui(c.id, null)} onClick={() => aoEscolher(c.id, null)}>
                        <Icone nome={c.tipo === "curso" ? "curso" : c.tipo === "livro" ? "livro" : "cadernos"} tamanho={18} />
                        {c.nome}
                      </button>
                      {c.secoes.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="destino destino-secao"
                          disabled={eAqui(c.id, s.id)}
                          onClick={() => aoEscolher(c.id, s.id)}
                        >
                          {s.nome}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          {cadernos.filter((c) => !c.arquivado).length === 0 && (
            <p className="vazio-pequeno">Ainda não há cadernos. Crie um em “Cadernos”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
