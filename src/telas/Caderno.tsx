import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { useNovaAnotacao } from "../app/novaAnotacao";
import {
  apagarCaderno,
  atualizarCaderno,
  criarSecao,
  moverSecao,
  removerSecao,
  renomearSecao,
} from "../dados/operacoes";
import { NOMES_TIPO_CADERNO, nomesStatusCaderno, type Caderno as TipoCaderno, type Ordenacao, type Secao } from "../dados/tipos";
import { FormularioCaderno } from "../componentes/FormularioCaderno";
import { ListaDePaginas } from "../componentes/ListaDePaginas";
import { Icone } from "../componentes/Icone";
import { Menu } from "../componentes/Menu";
import { NOMES_ORDENACAO, ordenarPaginas } from "../util/ordenar";
import { dataCurta } from "../util/datas";

export function Caderno() {
  const { id = "" } = useParams();
  const dados = useDados();
  const caderno = dados.cadernoPorId.get(id);
  if (!caderno) {
    return (
      <div className="tela">
        <p className="vazio">Este caderno não existe mais neste aparelho.</p>
        <Link to="/cadernos" className="botao botao-leve">
          Ver cadernos
        </Link>
      </div>
    );
  }
  return <TelaDoCaderno caderno={caderno} />;
}

function TelaDoCaderno({ caderno }: { caderno: TipoCaderno }) {
  const dados = useDados();
  const navegar = useNavigate();
  const nova = useNovaAnotacao();
  const { perguntar, confirmar, avisar } = useDialogos();
  const [editando, definirEditando] = useState(false);
  const [menu, definirMenu] = useState(false);
  const [menuSecao, definirMenuSecao] = useState<string | null>(null);
  const area = dados.areaPorId.get(caderno.areaId);
  const paginas = ordenarPaginas(
    dados.vivas.filter((p) => p.cadernoId === caderno.id),
    caderno.ordenacao,
  );
  const idsDeSecao = new Set(caderno.secoes.map((s) => s.id));
  const semSecao = paginas.filter((p) => !p.secaoId || !idsDeSecao.has(p.secaoId));
  const ficha = caderno.ficha;
  const status = nomesStatusCaderno(caderno.tipo);
  const rotuloSecao = caderno.tipo === "curso" ? "módulo" : caderno.tipo === "livro" ? "capítulo" : "seção";

  async function novaSecao() {
    const nome = await perguntar({
      titulo: `Novo ${rotuloSecao}`,
      rotulo: "Nome",
      placeholder: caderno.tipo === "curso" ? "Ex.: Módulo 1 — Fundamentos" : "",
      confirmar: "Criar",
    });
    if (nome) await criarSecao(caderno, nome);
  }

  async function renomear(s: Secao) {
    const nome = await perguntar({ titulo: `Renomear ${rotuloSecao}`, rotulo: "Nome", valor: s.nome, confirmar: "Salvar" });
    if (nome) await renomearSecao(caderno, s.id, nome);
  }

  async function tirarSecao(s: Secao) {
    const ok = await confirmar({
      titulo: `Tirar “${s.nome}”?`,
      texto: "Nenhuma página é apagada: as páginas desta seção ficam no caderno, sem seção.",
      confirmar: "Tirar",
    });
    if (ok) await removerSecao(caderno, s.id);
  }

  async function arquivar() {
    await atualizarCaderno(caderno.id, { arquivado: !caderno.arquivado });
    avisar(caderno.arquivado ? "Caderno de volta." : "Caderno arquivado. Continua na busca e em Arquivados.");
  }

  async function apagar() {
    const ok = await confirmar({ titulo: `Apagar “${caderno.nome}”?`, confirmar: "Apagar", perigo: true });
    if (!ok) return;
    if (await apagarCaderno(caderno.id)) navegar("/cadernos");
    else avisar("Só dá para apagar caderno vazio (nem na lixeira). Com páginas, arquive.");
  }

  return (
    <div className="tela">
      <nav className="trilha" aria-label="Onde está">
        <Link to="/cadernos">{area?.nome ?? "Cadernos"}</Link>
      </nav>

      <div className="cabeca-caderno">
        <h1 className="titulo-tela">{caderno.nome}</h1>
        <div className="menu-ancora">
          <button type="button" className="botao-icone" aria-label="Opções do caderno" aria-expanded={menu} onClick={() => definirMenu((m) => !m)}>
            <Icone nome="pontos" />
          </button>
          {menu && (
            <Menu fechar={() => definirMenu(false)}>
              <button type="button" role="menuitem" onClick={() => definirEditando(true)}>
                <Icone nome="editar" tamanho={18} /> Editar caderno
              </button>
              <button type="button" role="menuitem" onClick={() => void novaSecao()}>
                <Icone nome="mais" tamanho={18} /> Novo {rotuloSecao}
              </button>
              <button type="button" role="menuitem" onClick={() => navegar(`/imprimir/caderno/${caderno.id}`)}>
                <Icone nome="imprimir" tamanho={18} /> Imprimir ou salvar PDF
              </button>
              <button type="button" role="menuitem" onClick={() => void arquivar()}>
                <Icone nome="arquivo" tamanho={18} /> {caderno.arquivado ? "Desarquivar" : "Arquivar"}
              </button>
              {paginas.length === 0 && (
                <button type="button" role="menuitem" className="perigo" onClick={() => void apagar()}>
                  <Icone nome="lixeira" tamanho={18} /> Apagar
                </button>
              )}
            </Menu>
          )}
        </div>
      </div>

      {caderno.arquivado && <div className="faixa faixa-alerta">Caderno arquivado.</div>}

      {caderno.tipo !== "comum" && (
        <div className="ficha">
          <span className="etiqueta">{NOMES_TIPO_CADERNO[caderno.tipo]}</span>
          {ficha.status && <span className="ficha-status">{status[ficha.status]}</span>}
          {ficha.autor && <span>{ficha.autor}</span>}
          {ficha.plataforma && <span>{ficha.plataforma}</span>}
          {(ficha.inicio || ficha.fim) && (
            <span>
              {ficha.inicio ? dataCurta(ficha.inicio) : "…"} – {ficha.fim ? dataCurta(ficha.fim) : "…"}
            </span>
          )}
          {ficha.link && /^https?:\/\//i.test(ficha.link) && (
            <a href={ficha.link} target="_blank" rel="noopener noreferrer">
              Abrir link <Icone nome="abrir" tamanho={14} />
            </a>
          )}
        </div>
      )}

      <div className="linha-botoes">
        <button type="button" className="botao botao-principal" onClick={() => void nova({ cadernoId: caderno.id })}>
          <Icone nome="mais" tamanho={18} /> Nova página
        </button>
        <select
          className="seletor-leve"
          value={caderno.ordenacao}
          onChange={(e) => void atualizarCaderno(caderno.id, { ordenacao: e.target.value as Ordenacao })}
          aria-label="Ordem das páginas"
        >
          {(Object.keys(NOMES_ORDENACAO) as Ordenacao[]).map((o) => (
            <option key={o} value={o}>
              {NOMES_ORDENACAO[o]}
            </option>
          ))}
        </select>
      </div>

      {(semSecao.length > 0 || caderno.secoes.length === 0) && (
        <ListaDePaginas
          paginas={semSecao}
          mostrarCaminho={false}
          apoio={(p) => dataCurta(p.atualizadaEm)}
          vazio={caderno.secoes.length === 0 ? "Caderno vazio. Toque em “Nova página” para começar." : undefined}
        />
      )}

      {caderno.secoes.map((s, i) => {
        const dela = paginas.filter((p) => p.secaoId === s.id);
        return (
          <section key={s.id} className="secao">
            <div className="secao-cabeca">
              <h2 className="secao-titulo">{s.nome}</h2>
              <button
                type="button"
                className="botao-icone"
                aria-label={`Nova página em ${s.nome}`}
                title="Nova página aqui"
                onClick={() => void nova({ cadernoId: caderno.id, secaoId: s.id })}
              >
                <Icone nome="mais" tamanho={18} />
              </button>
              <div className="menu-ancora">
                <button
                  type="button"
                  className="botao-icone"
                  aria-label={`Opções de ${s.nome}`}
                  aria-expanded={menuSecao === s.id}
                  onClick={() => definirMenuSecao(menuSecao === s.id ? null : s.id)}
                >
                  <Icone nome="pontos" tamanho={18} />
                </button>
                {menuSecao === s.id && (
                  <Menu fechar={() => definirMenuSecao(null)}>
                    <button type="button" role="menuitem" onClick={() => void renomear(s)}>
                      <Icone nome="editar" tamanho={18} /> Renomear
                    </button>
                    {i > 0 && (
                      <button type="button" role="menuitem" onClick={() => void moverSecao(caderno, s.id, -1)}>
                        <Icone nome="subir" tamanho={18} /> Subir
                      </button>
                    )}
                    {i < caderno.secoes.length - 1 && (
                      <button type="button" role="menuitem" onClick={() => void moverSecao(caderno, s.id, 1)}>
                        <Icone nome="descer" tamanho={18} /> Descer
                      </button>
                    )}
                    <button type="button" role="menuitem" onClick={() => void tirarSecao(s)}>
                      <Icone nome="fechar" tamanho={18} /> Tirar {rotuloSecao}
                    </button>
                  </Menu>
                )}
              </div>
            </div>
            <ListaDePaginas paginas={dela} mostrarCaminho={false} apoio={(p) => dataCurta(p.atualizadaEm)} vazio="Nenhuma página aqui ainda." />
          </section>
        );
      })}

      {caderno.secoes.length === 0 && paginas.length > 3 && (
        <p className="dica">
          Muitas páginas? Dá para agrupar em {rotuloSecao}s pelo menu <Icone nome="pontos" tamanho={14} /> lá em cima.
        </p>
      )}

      {editando && (
        <FormularioCaderno
          inicial={caderno}
          areaId={caderno.areaId}
          aoFechar={() => definirEditando(false)}
          aoSalvar={async (d) => {
            definirEditando(false);
            await atualizarCaderno(caderno.id, d);
          }}
        />
      )}
    </div>
  );
}
