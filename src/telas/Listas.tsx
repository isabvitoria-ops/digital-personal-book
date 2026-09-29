import { useState } from "react";
import { Link } from "react-router-dom";
import { estaNaInbox, useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { ListaDePaginas } from "../componentes/ListaDePaginas";
import { MoverPara } from "../componentes/MoverPara";
import { Icone } from "../componentes/Icone";
import {
  apagarParaSempre,
  atualizarArea,
  atualizarCaderno,
  moverPagina,
  restaurarDaLixeira,
} from "../dados/operacoes";
import {
  NOMES_STATUS_ARTIGO,
  nomesStatusCaderno,
  type Caderno,
  type Pagina,
  type StatusArtigo,
  type StatusCaderno,
  type TipoCaderno,
} from "../dados/tipos";
import { dataCurta, haQuanto, hoje, mesEAno } from "../util/datas";

const porAtualizacao = (a: Pagina, b: Pagina) => b.atualizadaEm.localeCompare(a.atualizadaEm);

export function Inbox() {
  const dados = useDados();
  const { avisar } = useDialogos();
  const [movendo, definirMovendo] = useState<Pagina | null>(null);
  const paginas = dados.vivas.filter((p) => estaNaInbox(p, dados)).sort(porAtualizacao);
  return (
    <div className="tela">
      <h1 className="titulo-tela">Inbox</h1>
      <p className="dica">Onde cai o que foi anotado sem pensar em lugar. Organize quando der — não precisa ser agora.</p>
      <ListaDePaginas
        paginas={paginas}
        mostrarCaminho={false}
        apoio={(p) => `criada ${haQuanto(p.criadaEm)}`}
        direita={(p) => (
          <button
            type="button"
            className="botao-chip"
            onClick={() => definirMovendo(p)}
          >
            Mover
          </button>
        )}
        vazio="Inbox vazia. Tudo no lugar."
      />
      {movendo && (
        <MoverPara
          atual={movendo}
          aoFechar={() => definirMovendo(null)}
          aoEscolher={(cadernoId, secaoId) => {
            const p = movendo;
            definirMovendo(null);
            void moverPagina(p.id, cadernoId, secaoId).then(() =>
              avisar(`Movida para ${cadernoId ? dados.cadernoPorId.get(cadernoId)?.nome : "Inbox"}.`),
            );
          }}
        />
      )}
    </div>
  );
}

export function Favoritas() {
  const dados = useDados();
  return (
    <div className="tela">
      <h1 className="titulo-tela">Favoritas</h1>
      <ListaDePaginas
        paginas={dados.vivas.filter((p) => p.favorita).sort(porAtualizacao)}
        vazio="Nenhuma favorita ainda. Toque na estrela no topo de uma página para ela aparecer aqui."
      />
    </div>
  );
}

export function Revisar() {
  const dados = useDados();
  const h = hoje();
  const marcadas = dados.vivas.filter((p) => p.revisarEm).sort((a, b) => a.revisarEm!.localeCompare(b.revisarEm!));
  const agora = marcadas.filter((p) => p.revisarEm! <= h);
  const depois = marcadas.filter((p) => p.revisarEm! > h);
  return (
    <div className="tela">
      <h1 className="titulo-tela">Revisar</h1>
      <p className="dica">
        Páginas que você marcou para ler de novo. Ao revisar, escolha quando ela volta: em 1 semana, 1 mês ou 6 meses.
      </p>
      <section className="secao">
        <h2 className="secao-titulo">Para hoje</h2>
        <ListaDePaginas
          paginas={agora}
          direita={(p) => <span className="data">{p.revisarEm! < h ? `desde ${dataCurta(p.revisarEm!)}` : "hoje"}</span>}
          vazio="Nada para revisar hoje."
        />
      </section>
      {depois.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Próximas</h2>
          <ListaDePaginas paginas={depois} direita={(p) => <span className="data">{dataCurta(p.revisarEm!)}</span>} />
        </section>
      )}
    </div>
  );
}

export function Artigos() {
  const dados = useDados();
  const artigos = dados.vivas.filter((p) => p.tipo === "artigo").sort(porAtualizacao);
  const ordem: StatusArtigo[] = ["salvo", "lido", "estudado"];
  return (
    <div className="tela">
      <h1 className="titulo-tela">Artigos</h1>
      <p className="dica">
        Qualquer página vira artigo pelo botão “Artigo” no topo dela. Salvo → lido → estudado: só o estudado virou
        conhecimento seu.
      </p>
      {artigos.length === 0 && <p className="vazio">Nenhum artigo ainda.</p>}
      {ordem.map((s) => {
        const deste = artigos.filter((p) => (p.statusArtigo ?? "salvo") === s);
        if (deste.length === 0) return null;
        return (
          <section key={s} className="secao">
            <h2 className="secao-titulo">
              {NOMES_STATUS_ARTIGO[s]} <span className="contador">{deste.length}</span>
            </h2>
            <ListaDePaginas paginas={deste} />
          </section>
        );
      })}
    </div>
  );
}

function CadernosPorStatus({ tipo, titulo, dica }: { tipo: TipoCaderno; titulo: string; dica: string }) {
  const dados = useDados();
  const deste = dados.cadernos.filter((c) => c.tipo === tipo);
  const nomes = nomesStatusCaderno(tipo);
  const ordem: StatusCaderno[] = ["andamento", "quero", "pausado", "concluido"];
  const contar = (c: Caderno) => dados.vivas.filter((p) => p.cadernoId === c.id).length;
  return (
    <div className="tela">
      <h1 className="titulo-tela">{titulo}</h1>
      <p className="dica">{dica}</p>
      {deste.length === 0 && <p className="vazio">Nada aqui ainda.</p>}
      {ordem.map((s) => {
        const lista = deste.filter((c) => (c.ficha.status ?? "andamento") === s);
        if (lista.length === 0) return null;
        return (
          <section key={s} className="secao">
            <h2 className="secao-titulo">{nomes[s]}</h2>
            <ul className="lista">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link to={`/caderno/${c.id}`} className="item">
                    <span className="item-corpo">
                      <span className="item-titulo">{c.nome}</span>
                      <span className="item-apoio">
                        {[c.ficha.autor, c.ficha.plataforma, dados.areaPorId.get(c.areaId)?.nome].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="item-direita data">
                      {contar(c)} {contar(c) === 1 ? "página" : "páginas"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function Cursos() {
  return (
    <CadernosPorStatus
      tipo="curso"
      titulo="Cursos"
      dica="Cada curso é um caderno do tipo Curso, na área do assunto. Módulos viram seções, aulas viram páginas."
    />
  );
}

export function Biblioteca() {
  return (
    <CadernosPorStatus
      tipo="livro"
      titulo="Biblioteca"
      dica="Cada livro é um caderno do tipo Livro. Uma página por capítulo, ou uma só com tudo — como preferir."
    />
  );
}

export function LinhaDoTempo() {
  const dados = useDados();
  const paginas = [...dados.vivas].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  const [limite, definirLimite] = useState(150);
  const grupos: { mes: string; paginas: Pagina[] }[] = [];
  for (const p of paginas.slice(0, limite)) {
    const mes = mesEAno(p.criadaEm);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === mes) ultimo.paginas.push(p);
    else grupos.push({ mes, paginas: [p] });
  }
  return (
    <div className="tela">
      <h1 className="titulo-tela">Linha do tempo</h1>
      <p className="dica">Tudo o que você escreveu, pela data em que nasceu.</p>
      {paginas.length === 0 && <p className="vazio">Nenhuma página ainda.</p>}
      {grupos.map((g) => (
        <section key={g.mes} className="secao">
          <h2 className="secao-titulo">{g.mes}</h2>
          <ListaDePaginas paginas={g.paginas} direita={(p) => <span className="data">{new Date(p.criadaEm).getDate()}</span>} />
        </section>
      ))}
      {paginas.length > limite && (
        <button type="button" className="botao botao-leve" onClick={() => definirLimite((l) => l + 150)}>
          Mostrar mais
        </button>
      )}
    </div>
  );
}

export function Arquivados() {
  const dados = useDados();
  const areas = dados.areas.filter((a) => a.arquivada);
  const cadernos = dados.cadernos.filter((c) => c.arquivado || dados.areaPorId.get(c.areaId)?.arquivada);
  return (
    <div className="tela">
      <h1 className="titulo-tela">Arquivados</h1>
      <p className="dica">
        O que saiu do dia a dia, mas não se apaga: continua aparecendo na busca. Desarquive quando voltar a usar.
      </p>
      {areas.length === 0 && cadernos.length === 0 && <p className="vazio">Nada arquivado.</p>}
      {areas.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Áreas</h2>
          <ul className="lista">
            {areas.map((a) => (
              <li key={a.id} className="item">
                <span className="item-corpo">
                  <span className="item-titulo">{a.nome}</span>
                </span>
                <button type="button" className="botao-chip" onClick={() => void atualizarArea(a.id, { arquivada: false })}>
                  Desarquivar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {cadernos.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Cadernos</h2>
          <ul className="lista">
            {cadernos.map((c) => (
              <li key={c.id} className="item">
                <Link to={`/caderno/${c.id}`} className="item-corpo">
                  <span className="item-titulo">{c.nome}</span>
                  <span className="item-apoio">{dados.areaPorId.get(c.areaId)?.nome}</span>
                </Link>
                {c.arquivado && (
                  <button type="button" className="botao-chip" onClick={() => void atualizarCaderno(c.id, { arquivado: false })}>
                    Desarquivar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function Lixeira() {
  const dados = useDados();
  const { confirmar } = useDialogos();
  const paginas = dados.paginas.filter((p) => p.excluidaEm).sort((a, b) => b.excluidaEm!.localeCompare(a.excluidaEm!));

  async function apagar(p: Pagina) {
    const ok = await confirmar({
      titulo: "Apagar para sempre?",
      texto: "A página e os anexos dela saem deste aparelho. Não tem volta — a não ser por um backup antigo.",
      confirmar: "Apagar para sempre",
      perigo: true,
    });
    if (ok) await apagarParaSempre(p.id);
  }

  async function esvaziar() {
    const ok = await confirmar({
      titulo: `Apagar ${paginas.length} ${paginas.length === 1 ? "página" : "páginas"} para sempre?`,
      texto: "Não tem volta — a não ser por um backup antigo.",
      confirmar: "Esvaziar lixeira",
      perigo: true,
    });
    if (ok) for (const p of paginas) await apagarParaSempre(p.id);
  }

  return (
    <div className="tela">
      <h1 className="titulo-tela">Lixeira</h1>
      <p className="dica">Nada daqui some sozinho. Só sai quando você apagar para sempre.</p>
      <ListaDePaginas
        paginas={paginas}
        apoio={(p) => `na lixeira desde ${dataCurta(p.excluidaEm!)}`}
        direita={(p) => (
          <span className="linha-botoes-pequena">
            <button
              type="button"
              className="botao-chip"
              onClick={() => void restaurarDaLixeira(p.id)}
            >
              Restaurar
            </button>
            <button
              type="button"
              className="botao-icone perigo"
              aria-label="Apagar para sempre"
              onClick={() => void apagar(p)}
            >
              <Icone nome="lixeira" tamanho={18} />
            </button>
          </span>
        )}
        vazio="Lixeira vazia."
      />
      {paginas.length > 1 && (
        <button type="button" className="botao botao-leve perigo" onClick={() => void esvaziar()}>
          Esvaziar lixeira
        </button>
      )}
    </div>
  );
}
