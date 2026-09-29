import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import type { Editor } from "@tiptap/react";
import { caminhoDaPagina, useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { db } from "../dados/banco";
import {
  apagarAnexo,
  atualizarPagina,
  descartarSeVazia,
  mandarParaLixeira,
  marcarAberta,
  moverPagina,
  restaurarDaLixeira,
} from "../dados/operacoes";
import {
  MARCADORES,
  NOMES_STATUS_ARTIGO,
  type Anexo,
  type Pagina as TipoPagina,
  type StatusArtigo,
} from "../dados/tipos";
import { EditorDaPagina } from "../editor/EditorDaPagina";
import { abrirAnexo } from "../editor/anexos";
import { Icone } from "../componentes/Icone";
import { Menu } from "../componentes/Menu";
import { MoverPara } from "../componentes/MoverPara";
import { ListaDePaginas } from "../componentes/ListaDePaginas";
import { dataCompleta, dataCurta, dataDeRevisao, diaCurto, hoje, NOMES_PRAZO, type PrazoRevisao } from "../util/datas";
import { quemCita, anexosCitados } from "../util/links";
import { baixarArquivo, tamanhoLegivel } from "../util/arquivos";
import { nomeDeArquivo, tituloVisivel } from "../util/texto";
import { paginaAvulsaEmMarkdown } from "../dados/exportarPagina";

export function Pagina() {
  const { id = "" } = useParams();
  const dados = useDados();
  const pagina = dados.paginaPorId.get(id);

  if (!pagina) {
    return (
      <div className="tela">
        <p className="vazio">Esta página não existe mais neste aparelho.</p>
        <Link to="/" className="botao botao-leve">
          Voltar ao início
        </Link>
      </div>
    );
  }
  // key: trocar de página recria a tela inteira (editor incluído) do zero.
  return <TelaDaPagina key={pagina.id} pagina={pagina} />;
}

function TelaDaPagina({ pagina }: { pagina: TipoPagina }) {
  const dados = useDados();
  const navegar = useNavigate();
  const local = useLocation();
  const { confirmar, avisar } = useDialogos();
  const [titulo, definirTitulo] = useState(pagina.titulo);
  const [movendo, definirMovendo] = useState(false);
  const [menu, definirMenu] = useState(false);
  const [revisando, definirRevisando] = useState(false);
  const campoTitulo = useRef<HTMLTextAreaElement>(null);
  const editor = useRef<Editor | null>(null);
  const anexos = useLiveQuery(() => db.anexos.where("paginaId").equals(pagina.id).toArray(), [pagina.id]) ?? [];

  // --- Salvar ---------------------------------------------------------------
  // O texto é salvo 0,7 s depois que ela para de digitar, e na hora ao sair
  // da página ou do app. Nunca há botão "salvar".
  const ultimoConteudo = useRef(pagina.conteudo);
  const pendente = useRef(false);
  const relogio = useRef<number | undefined>(undefined);
  const relogioTitulo = useRef<number | undefined>(undefined);
  const ultimoTitulo = useRef(pagina.titulo);

  const salvarTexto = useCallback(async () => {
    window.clearTimeout(relogio.current);
    if (!pendente.current || !editor.current) return;
    pendente.current = false;
    const md = editor.current.getMarkdown();
    if (md === ultimoConteudo.current) return;
    ultimoConteudo.current = md;
    await atualizarPagina(pagina.id, { conteudo: md });
  }, [pagina.id]);

  const salvarTitulo = useCallback(
    async (valor: string) => {
      window.clearTimeout(relogioTitulo.current);
      if (valor === ultimoTitulo.current) return;
      ultimoTitulo.current = valor;
      await atualizarPagina(pagina.id, { titulo: valor });
    },
    [pagina.id],
  );

  const aoMudarTexto = useCallback(() => {
    pendente.current = true;
    window.clearTimeout(relogio.current);
    if (document.visibilityState === "hidden") void salvarTexto();
    else relogio.current = window.setTimeout(() => void salvarTexto(), 700);
  }, [salvarTexto]);

  const tituloAtual = useRef(titulo);
  tituloAtual.current = titulo;

  useEffect(() => {
    void marcarAberta(pagina.id);
    // Página nova: o cursor já vai para o título.
    if ((local.state as { nova?: boolean } | null)?.nova) campoTitulo.current?.focus();
    return () => {
      // Saindo da página: salva o que falta e, se ficou vazia, some.
      void Promise.all([salvarTexto(), salvarTitulo(tituloAtual.current)]).then(() => descartarSeVazia(pagina.id));
    };
  }, [pagina.id]);

  useEffect(() => {
    const el = campoTitulo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [titulo]);

  // --- Ações ----------------------------------------------------------------
  const caminho = caminhoDaPagina(pagina, dados);
  const caderno = pagina.cadernoId ? dados.cadernoPorId.get(pagina.cadernoId) : undefined;
  const mencionadaEm = quemCita(pagina.id, dados.vivas);
  const paraRevisarHoje = pagina.revisarEm !== null && pagina.revisarEm <= hoje();
  const citados = new Set(anexosCitados(pagina.conteudo));

  async function lixeira() {
    await salvarTexto();
    await mandarParaLixeira(pagina.id);
    avisar("Página foi para a lixeira.");
    navegar(-1);
  }

  async function marcarRevisao(prazo: PrazoRevisao | null) {
    definirRevisando(false);
    await atualizarPagina(pagina.id, { revisarEm: prazo ? dataDeRevisao(prazo) : null });
    if (prazo) avisar(`Volta para você ${prazo === "hoje" ? "hoje" : `em ${dataCurta(dataDeRevisao(prazo))}`}.`);
  }

  async function baixarMd() {
    await salvarTexto();
    const atual = await db.paginas.get(pagina.id);
    if (!atual) return;
    const md = paginaAvulsaEmMarkdown(atual);
    baixarArquivo(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${nomeDeArquivo(tituloVisivel(atual.titulo, atual.conteudo))}.md`);
  }

  async function tirarAnexo(a: Anexo) {
    const ok = await confirmar({
      titulo: `Apagar “${a.nome}”?`,
      texto: citados.has(a.id)
        ? "O arquivo sai deste aparelho e o link no texto deixa de abrir."
        : "O arquivo sai deste aparelho.",
      confirmar: "Apagar",
      perigo: true,
    });
    if (ok) await apagarAnexo(a.id);
  }

  if (pagina.excluidaEm) {
    return (
      <div className="tela">
        <div className="faixa faixa-alerta">
          <span>Esta página está na lixeira.</span>
          <button type="button" className="botao botao-leve" onClick={() => void restaurarDaLixeira(pagina.id)}>
            Tirar da lixeira
          </button>
        </div>
        <h1 className="titulo-pagina-leitura">{tituloVisivel(pagina.titulo, pagina.conteudo)}</h1>
      </div>
    );
  }

  return (
    <article className="tela tela-pagina">
      <header className="cabeca-pagina">
        <nav className="trilha" aria-label="Onde está">
          {caderno ? (
            <>
              <Link to="/cadernos">{caminho[0]}</Link>
              <span aria-hidden="true">›</span>
              <Link to={`/caderno/${caderno.id}`}>{caminho[1]}</Link>
              {caminho[2] && (
                <>
                  <span aria-hidden="true">›</span>
                  <span>{caminho[2]}</span>
                </>
              )}
            </>
          ) : (
            <Link to="/inbox">Inbox</Link>
          )}
        </nav>
        <div className="cabeca-acoes">
          <button
            type="button"
            className={`botao-icone ${pagina.favorita ? "favorita" : ""}`}
            aria-pressed={pagina.favorita}
            aria-label={pagina.favorita ? "Tirar das favoritas" : "Favoritar"}
            title={pagina.favorita ? "Tirar das favoritas" : "Favoritar"}
            onClick={() => void atualizarPagina(pagina.id, { favorita: !pagina.favorita })}
          >
            <Icone nome="estrela" cheio={pagina.favorita} />
          </button>
          <div className="menu-ancora">
            <button
              type="button"
              className="botao-icone"
              aria-label="Mais ações"
              aria-expanded={menu}
              onClick={() => definirMenu((m) => !m)}
            >
              <Icone nome="pontos" />
            </button>
            {menu && (
              <Menu fechar={() => definirMenu(false)}>
                <button type="button" role="menuitem" onClick={() => definirMovendo(true)}>
                  <Icone nome="mover" tamanho={18} /> Mover para…
                </button>
                <button type="button" role="menuitem" onClick={() => void salvarTexto().then(() => navegar(`/imprimir/pagina/${pagina.id}`))}>
                  <Icone nome="imprimir" tamanho={18} /> Imprimir ou salvar PDF
                </button>
                <button type="button" role="menuitem" onClick={() => void baixarMd()}>
                  <Icone nome="backup" tamanho={18} /> Baixar como texto (.md)
                </button>
                <button type="button" role="menuitem" className="perigo" onClick={() => void lixeira()}>
                  <Icone nome="lixeira" tamanho={18} /> Mandar para a lixeira
                </button>
              </Menu>
            )}
          </div>
        </div>
      </header>

      {estaSemLugar(pagina) && (
        <button type="button" className="faixa faixa-inbox faixa-fina" onClick={() => definirMovendo(true)}>
          <Icone nome="inbox" tamanho={16} />
          <span>
            Na Inbox · <strong>mover para um caderno</strong>
          </span>
        </button>
      )}

      {paraRevisarHoje && (
        <div className="faixa faixa-revisar">
          <span>
            <strong>Para revisar.</strong> Leu de novo? Quando volta?
          </span>
          <div className="faixa-botoes">
            <button type="button" className="botao-chip" onClick={() => void marcarRevisao("semana")}>1 semana</button>
            <button type="button" className="botao-chip" onClick={() => void marcarRevisao("mes")}>1 mês</button>
            <button type="button" className="botao-chip" onClick={() => void marcarRevisao("semestre")}>6 meses</button>
            <button type="button" className="botao-chip" onClick={() => void marcarRevisao(null)}>Não precisa mais</button>
          </div>
        </div>
      )}

      <textarea
        ref={campoTitulo}
        className="titulo-pagina"
        placeholder="Título"
        rows={1}
        value={titulo}
        aria-label="Título"
        onChange={(e) => {
          const v = e.target.value.replace(/\n/g, " ");
          definirTitulo(v);
          window.clearTimeout(relogioTitulo.current);
          relogioTitulo.current = window.setTimeout(() => void salvarTitulo(v), 500);
        }}
        onBlur={() => void salvarTitulo(titulo)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // view.focus() é imediato (o cursor já começa no início do texto).
            // O focus() do editor espera um quadro: a primeira letra digitada
            // nesse meio-tempo cairia no título.
            editor.current?.view.focus();
          }
        }}
      />

      <div className="detalhes">
        <button
          type="button"
          className="botao-chip"
          aria-pressed={pagina.tipo === "artigo"}
          onClick={() =>
            void atualizarPagina(
              pagina.id,
              pagina.tipo === "artigo" ? { tipo: "nota" } : { tipo: "artigo", statusArtigo: pagina.statusArtigo ?? "salvo" },
            )
          }
          title="Marcar como artigo para aparecer em Artigos"
        >
          <Icone nome="artigo" tamanho={15} /> Artigo
        </button>
        {MARCADORES.map((m) => (
          <button
            key={m}
            type="button"
            className="botao-chip"
            aria-pressed={pagina.marcadores.includes(m)}
            onClick={() =>
              void atualizarPagina(pagina.id, {
                marcadores: pagina.marcadores.includes(m)
                  ? pagina.marcadores.filter((x) => x !== m)
                  : MARCADORES.filter((x) => x === m || pagina.marcadores.includes(x)),
              })
            }
          >
            {dados.config.nomesMarcadores[m]}
          </button>
        ))}
        <div className="menu-ancora">
          <button
            type="button"
            className="botao-chip"
            aria-pressed={pagina.revisarEm !== null}
            aria-expanded={revisando}
            onClick={() => definirRevisando((r) => !r)}
          >
            <Icone nome="revisar" tamanho={15} />
            {pagina.revisarEm ? `Revisar ${diaCurto(pagina.revisarEm)}` : "Revisar…"}
          </button>
          {revisando && (
            <Menu fechar={() => definirRevisando(false)}>
              {(Object.keys(NOMES_PRAZO) as PrazoRevisao[]).map((p) => (
                <button key={p} type="button" role="menuitem" onClick={() => void marcarRevisao(p)}>
                  {NOMES_PRAZO[p]}
                </button>
              ))}
              {pagina.revisarEm && (
                <button type="button" role="menuitem" onClick={() => void marcarRevisao(null)}>
                  Não revisar
                </button>
              )}
            </Menu>
          )}
        </div>
      </div>

      {pagina.tipo === "artigo" && (
        <div className="ficha-artigo">
          <label className="campo campo-linha">
            <span className="campo-rotulo">Situação</span>
            <select
              value={pagina.statusArtigo ?? "salvo"}
              onChange={(e) => void atualizarPagina(pagina.id, { statusArtigo: e.target.value as StatusArtigo })}
            >
              {(Object.keys(NOMES_STATUS_ARTIGO) as StatusArtigo[]).map((s) => (
                <option key={s} value={s}>
                  {NOMES_STATUS_ARTIGO[s]}
                </option>
              ))}
            </select>
          </label>
          <CampoFonte pagina={pagina} />
        </div>
      )}

      <EditorDaPagina
        paginaId={pagina.id}
        conteudoInicial={pagina.conteudo}
        aoCriar={(e) => (editor.current = e)}
        aoMudar={aoMudarTexto}
        abrirPagina={(id) => void salvarTexto().then(() => navegar(`/pagina/${id}`))}
      />

      {anexos.length > 0 && (
        <section className="secao-pagina">
          <h2 className="secao-titulo">Anexos</h2>
          <ul className="lista-anexos">
            {anexos.map((a) => (
              <li key={a.id} className="anexo">
                <button type="button" className="anexo-abrir" onClick={() => void abrirAnexo(a.id)}>
                  <Icone nome={a.tipo.startsWith("image/") ? "imagem" : "clipe"} tamanho={18} />
                  <span className="anexo-nome">{a.nome}</span>
                  <span className="anexo-tamanho">{tamanhoLegivel(a.tamanho)}</span>
                </button>
                <button type="button" className="botao-icone" aria-label={`Baixar ${a.nome}`} title="Baixar" onClick={() => baixarArquivo(a.dados, a.nome)}>
                  <Icone nome="backup" tamanho={18} />
                </button>
                <button type="button" className="botao-icone" aria-label={`Apagar ${a.nome}`} title="Apagar" onClick={() => void tirarAnexo(a)}>
                  <Icone nome="lixeira" tamanho={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mencionadaEm.length > 0 && (
        <section className="secao-pagina">
          <h2 className="secao-titulo">Mencionada em</h2>
          <ListaDePaginas paginas={mencionadaEm} />
        </section>
      )}

      <footer className="rodape-pagina">
        Criada em {dataCompleta(pagina.criadaEm)}
        <br />
        Atualizada em {dataCompleta(pagina.atualizadaEm)}
      </footer>

      {movendo && (
        <MoverPara
          atual={pagina}
          aoFechar={() => definirMovendo(false)}
          aoEscolher={(cadernoId, secaoId) => {
            definirMovendo(false);
            void moverPagina(pagina.id, cadernoId, secaoId).then(() => {
              const destino = cadernoId ? dados.cadernoPorId.get(cadernoId)?.nome : "Inbox";
              avisar(`Movida para ${destino}.`);
            });
          }}
        />
      )}
    </article>
  );

  function estaSemLugar(p: TipoPagina) {
    return !p.cadernoId || !dados.cadernoPorId.has(p.cadernoId);
  }
}

function CampoFonte({ pagina }: { pagina: TipoPagina }) {
  const [fonte, definirFonte] = useState(pagina.fonte);
  const ehLink = /^https?:\/\/\S+$/i.test(fonte.trim());
  return (
    <label className="campo campo-linha campo-fonte">
      <span className="campo-rotulo">Fonte</span>
      <input
        value={fonte}
        placeholder="Link, revista, autores…"
        onChange={(e) => definirFonte(e.target.value)}
        onBlur={() => fonte !== pagina.fonte && void atualizarPagina(pagina.id, { fonte })}
      />
      {ehLink && (
        <a className="botao-icone" href={fonte.trim()} target="_blank" rel="noopener noreferrer" aria-label="Abrir a fonte">
          <Icone nome="abrir" tamanho={18} />
        </a>
      )}
    </label>
  );
}
