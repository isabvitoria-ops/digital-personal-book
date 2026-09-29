import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Pagina } from "../dados/tipos";
import { caminhoDaPagina, useDados } from "../app/Dados";
import { tituloVisivel } from "../util/texto";
import { Icone } from "./Icone";

/** A linha de página que se repete em todas as listas do app. */
export function ListaDePaginas({
  paginas,
  mostrarCaminho = true,
  direita,
  apoio,
  vazio,
}: {
  paginas: Pagina[];
  mostrarCaminho?: boolean;
  direita?: (p: Pagina) => ReactNode;
  apoio?: (p: Pagina) => ReactNode;
  vazio?: ReactNode;
}) {
  const dados = useDados();
  if (paginas.length === 0) return vazio ? <p className="vazio">{vazio}</p> : null;
  return (
    <ul className="lista">
      {paginas.map((p) => (
        <li key={p.id} className="linha-item">
          <Link to={`/pagina/${p.id}`} className="item">
            <span className="item-corpo">
              <span className="item-titulo">
                {p.favorita && <Icone nome="estrela" tamanho={14} cheio />}
                {tituloVisivel(p.titulo, p.conteudo)}
              </span>
              {(mostrarCaminho || apoio) && (
                <span className="item-apoio">
                  {apoio ? apoio(p) : caminhoDaPagina(p, dados).join(" › ")}
                </span>
              )}
            </span>
          </Link>
          {direita && <span className="item-direita">{direita(p)}</span>}
        </li>
      ))}
    </ul>
  );
}
