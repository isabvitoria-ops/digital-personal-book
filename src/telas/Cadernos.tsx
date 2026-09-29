import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { apagarArea, atualizarArea, criarArea, criarAreasSugeridas, criarCaderno, AREAS_SUGERIDAS } from "../dados/operacoes";
import { NOMES_TIPO_CADERNO, nomesStatusCaderno, type Area, type Id } from "../dados/tipos";
import { FormularioCaderno } from "../componentes/FormularioCaderno";
import { Icone } from "../componentes/Icone";
import { Menu } from "../componentes/Menu";

export function Cadernos() {
  const dados = useDados();
  const navegar = useNavigate();
  const { perguntar, confirmar, avisar } = useDialogos();
  const [criandoEm, definirCriandoEm] = useState<Id | null>(null);
  const [menuDe, definirMenuDe] = useState<Id | null>(null);
  const ativas = dados.areas.filter((a) => !a.arquivada);

  async function novaArea() {
    const nome = await perguntar({ titulo: "Nova área", rotulo: "Nome", placeholder: "Ex.: Idiomas", confirmar: "Criar" });
    if (nome) await criarArea(nome);
  }

  async function renomear(a: Area) {
    const nome = await perguntar({ titulo: "Renomear área", rotulo: "Nome", valor: a.nome, confirmar: "Salvar" });
    if (nome) await atualizarArea(a.id, { nome });
  }

  async function mover(a: Area, direcao: -1 | 1) {
    const lista = ativas;
    const i = lista.findIndex((x) => x.id === a.id);
    const outra = lista[i + direcao];
    if (!outra) return;
    await atualizarArea(a.id, { ordem: outra.ordem });
    await atualizarArea(outra.id, { ordem: a.ordem });
  }

  async function arquivar(a: Area) {
    const ok = await confirmar({
      titulo: `Arquivar “${a.nome}”?`,
      texto: "Ela e os cadernos dela saem das telas do dia a dia, mas continuam na busca e em Arquivados. Dá para desarquivar quando quiser.",
      confirmar: "Arquivar",
    });
    if (ok) {
      await atualizarArea(a.id, { arquivada: true });
      avisar("Área arquivada.");
    }
  }

  async function apagar(a: Area) {
    const ok = await confirmar({ titulo: `Apagar “${a.nome}”?`, confirmar: "Apagar", perigo: true });
    if (!ok) return;
    if (!(await apagarArea(a.id))) avisar("Só dá para apagar área vazia. Com cadernos dentro, arquive.");
  }

  return (
    <div className="tela">
      <h1 className="titulo-tela">Cadernos</h1>

      {dados.areas.length === 0 && (
        <section className="cartao boas-vindas">
          <h2>Nenhuma área ainda</h2>
          <p>Áreas são os grandes assuntos da sua vida. Sugestão para começar:</p>
          <p className="areas-sugeridas">{AREAS_SUGERIDAS.join(" · ")}</p>
          <div className="linha-botoes">
            <button type="button" className="botao botao-principal" onClick={() => void criarAreasSugeridas()}>
              Usar estas
            </button>
            <button type="button" className="botao botao-leve" onClick={() => void novaArea()}>
              Criar a minha
            </button>
          </div>
        </section>
      )}

      {ativas.map((area, i) => {
        const dela = dados.cadernos.filter((c) => c.areaId === area.id && !c.arquivado);
        return (
          <section key={area.id} className="area">
            <div className="area-cabeca">
              <h2 className="area-nome">{area.nome}</h2>
              <div className="menu-ancora">
                <button
                  type="button"
                  className="botao-icone"
                  aria-label={`Opções de ${area.nome}`}
                  aria-expanded={menuDe === area.id}
                  onClick={() => definirMenuDe(menuDe === area.id ? null : area.id)}
                >
                  <Icone nome="pontos" />
                </button>
                {menuDe === area.id && (
                  <Menu fechar={() => definirMenuDe(null)}>
                    <button type="button" role="menuitem" onClick={() => void renomear(area)}>
                      <Icone nome="editar" tamanho={18} /> Renomear
                    </button>
                    {i > 0 && (
                      <button type="button" role="menuitem" onClick={() => void mover(area, -1)}>
                        <Icone nome="subir" tamanho={18} /> Subir
                      </button>
                    )}
                    {i < ativas.length - 1 && (
                      <button type="button" role="menuitem" onClick={() => void mover(area, 1)}>
                        <Icone nome="descer" tamanho={18} /> Descer
                      </button>
                    )}
                    <button type="button" role="menuitem" onClick={() => void arquivar(area)}>
                      <Icone nome="arquivo" tamanho={18} /> Arquivar
                    </button>
                    {dela.length === 0 && (
                      <button type="button" role="menuitem" className="perigo" onClick={() => void apagar(area)}>
                        <Icone nome="lixeira" tamanho={18} /> Apagar
                      </button>
                    )}
                  </Menu>
                )}
              </div>
            </div>
            <ul className="grade-cadernos">
              {dela.map((c) => {
                const paginas = dados.vivas.filter((p) => p.cadernoId === c.id).length;
                return (
                  <li key={c.id}>
                    <Link to={`/caderno/${c.id}`} className="cartao-caderno">
                      <span className="cartao-caderno-nome">{c.nome}</span>
                      <span className="cartao-caderno-apoio">
                        {c.tipo !== "comum" && <span className="etiqueta">{NOMES_TIPO_CADERNO[c.tipo]}</span>}
                        {c.ficha.status && c.tipo !== "comum" && `${nomesStatusCaderno(c.tipo)[c.ficha.status]} · `}
                        {paginas} {paginas === 1 ? "página" : "páginas"}
                      </span>
                    </Link>
                  </li>
                );
              })}
              <li>
                <button type="button" className="cartao-caderno cartao-novo" onClick={() => definirCriandoEm(area.id)}>
                  <Icone nome="mais" tamanho={18} /> Novo caderno
                </button>
              </li>
            </ul>
          </section>
        );
      })}

      {dados.areas.length > 0 && (
        <button type="button" className="botao botao-leve" onClick={() => void novaArea()}>
          <Icone nome="mais" tamanho={18} /> Nova área
        </button>
      )}

      {dados.areas.some((a) => a.arquivada) || dados.cadernos.some((c) => c.arquivado) ? (
        <p className="dica">
          <Link to="/arquivados">Ver arquivados</Link>
        </p>
      ) : null}

      {criandoEm && (
        <FormularioCaderno
          areaId={criandoEm}
          aoFechar={() => definirCriandoEm(null)}
          aoSalvar={async (d) => {
            definirCriandoEm(null);
            const c = await criarCaderno(d.areaId, d.nome, d.tipo, d.ficha);
            navegar(`/caderno/${c.id}`);
          }}
        />
      )}
    </div>
  );
}
