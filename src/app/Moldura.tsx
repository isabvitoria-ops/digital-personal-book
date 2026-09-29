import { useEffect, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { estaNaInbox, useDados } from "./Dados";
import { useNovaAnotacao } from "./novaAnotacao";
import { Icone, type NomeIcone } from "../componentes/Icone";

/**
 * A casca do app.
 *
 * No computador: barra lateral com os atalhos e as áreas. No celular: barra
 * embaixo, ao alcance do polegar, com o "+" no meio. É a mesma navegação,
 * arrumada para cada tamanho — nada que só existe num dos dois.
 */
export function Moldura({ children }: { children: ReactNode }) {
  const dados = useDados();
  const nova = useNovaAnotacao();
  const navegar = useNavigate();
  const local = useLocation();
  const naInbox = dados.vivas.filter((p) => estaNaInbox(p, dados)).length;

  // Dentro de um caderno, o "+" cria a página ali mesmo.
  const cadernoAberto = local.pathname.match(/^\/caderno\/([a-z0-9]+)/)?.[1];
  const paginaAberta = local.pathname.match(/^\/pagina\/([a-z0-9]+)/)?.[1];
  const cadernoEmVista = cadernoAberto ?? (paginaAberta ? dados.paginaPorId.get(paginaAberta)?.cadernoId : undefined);
  const criar = () => void nova(cadernoAberto && dados.cadernoPorId.has(cadernoAberto) ? { cadernoId: cadernoAberto } : undefined);

  // Ctrl/Cmd+K: buscar de qualquer lugar (no computador).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navegar("/buscar");
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [navegar]);

  const atalho = (para: string, icone: NomeIcone, rotulo: string, contador?: number) => (
    <NavLink to={para} end={para === "/"} className="lateral-link">
      <Icone nome={icone} tamanho={18} />
      <span>{rotulo}</span>
      {!!contador && <span className="contador">{contador}</span>}
    </NavLink>
  );

  return (
    <div className="moldura">
      <aside className="lateral" aria-label="Navegação">
        <Link to="/" className="marca">
          Meu Caderno
        </Link>
        <button type="button" className="botao botao-principal botao-largo" onClick={criar}>
          <Icone nome="mais" tamanho={18} /> Nova anotação
        </button>
        <nav className="lateral-grupo">
          {atalho("/", "inicio", "Início")}
          {atalho("/buscar", "buscar", "Buscar")}
          {atalho("/inbox", "inbox", "Inbox", naInbox)}
          {atalho("/favoritas", "estrela", "Favoritas")}
          {atalho("/revisar", "revisar", "Revisar")}
        </nav>
        <nav className="lateral-grupo">
          {atalho("/cursos", "curso", "Cursos")}
          {atalho("/biblioteca", "livro", "Biblioteca")}
          {atalho("/artigos", "artigo", "Artigos")}
          {atalho("/linha-do-tempo", "tempo", "Linha do tempo")}
        </nav>
        <nav className="lateral-grupo lateral-areas" aria-label="Áreas">
          <NavLink to="/cadernos" end className="lateral-titulo">
            Cadernos
          </NavLink>
          {dados.areas
            .filter((a) => !a.arquivada)
            .map((area) => {
              const dela = dados.cadernos.filter((c) => c.areaId === area.id && !c.arquivado);
              return (
                <details key={area.id} className="lateral-area" open={dela.some((c) => c.id === cadernoEmVista) || undefined}>
                  <summary>{area.nome}</summary>
                  {dela.map((c) => (
                    <NavLink key={c.id} to={`/caderno/${c.id}`} className="lateral-link lateral-caderno">
                      {c.nome}
                    </NavLink>
                  ))}
                  {dela.length === 0 && <span className="lateral-vazio">vazia</span>}
                </details>
              );
            })}
        </nav>
        <nav className="lateral-grupo lateral-rodape">
          {atalho("/backup", "backup", "Backup")}
          {atalho("/mais", "menu", "Mais")}
        </nav>
      </aside>

      <main className="conteudo">{children}</main>

      <nav className="barra-inferior" aria-label="Navegação">
        <NavLink to="/" end className="aba">
          <Icone nome="inicio" />
          <span>Início</span>
        </NavLink>
        <NavLink to="/buscar" className="aba">
          <Icone nome="buscar" />
          <span>Buscar</span>
        </NavLink>
        <button type="button" className="aba aba-mais" onClick={criar} aria-label="Nova anotação">
          <span className="aba-mais-circulo">
            <Icone nome="mais" tamanho={26} />
          </span>
        </button>
        <NavLink to="/cadernos" className="aba">
          <Icone nome="cadernos" />
          <span>Cadernos</span>
        </NavLink>
        <NavLink to="/mais" className="aba">
          <Icone nome="menu" />
          <span>Mais</span>
          {naInbox > 0 && <span className="ponto" aria-label={`${naInbox} na Inbox`} />}
        </NavLink>
      </nav>
    </div>
  );
}
