import { useState } from "react";
import { useDados } from "../app/Dados";
import {
  NOMES_TIPO_CADERNO,
  nomesStatusCaderno,
  type Caderno,
  type Ficha,
  type Id,
  type StatusCaderno,
  type TipoCaderno,
} from "../dados/tipos";
import { Icone } from "./Icone";

export interface DadosDoCaderno {
  nome: string;
  tipo: TipoCaderno;
  areaId: Id;
  ficha: Ficha;
}

/** Criar e editar caderno é o mesmo formulário — com a ficha do tipo escolhido. */
export function FormularioCaderno({
  inicial,
  areaId,
  aoSalvar,
  aoFechar,
}: {
  inicial?: Caderno;
  areaId: Id;
  aoSalvar: (d: DadosDoCaderno) => void;
  aoFechar: () => void;
}) {
  const { areas } = useDados();
  const [nome, definirNome] = useState(inicial?.nome ?? "");
  const [tipo, definirTipo] = useState<TipoCaderno>(inicial?.tipo ?? "comum");
  const [area, definirArea] = useState<Id>(inicial?.areaId ?? areaId);
  const [ficha, definirFicha] = useState<Ficha>(inicial?.ficha ?? {});
  const f = (campo: keyof Ficha, valor: string) => definirFicha((x) => ({ ...x, [campo]: valor || undefined }));
  const status = nomesStatusCaderno(tipo);

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={inicial ? "Editar caderno" : "Novo caderno"}
        onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          aoSalvar({
            nome: nome.trim(),
            tipo,
            areaId: area,
            ficha: tipo === "comum" ? {} : { status: "andamento", ...ficha },
          });
        }}
      >
        <div className="modal-cabeca">
          <h2 className="modal-titulo">{inicial ? "Editar caderno" : "Novo caderno"}</h2>
          <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>

        <label className="campo">
          <span className="campo-rotulo">Nome</span>
          <input autoFocus value={nome} onChange={(e) => definirNome(e.target.value)} placeholder="Ex.: Pós em Nutrição Clínica" />
        </label>

        <fieldset className="campo">
          <legend className="campo-rotulo">É um…</legend>
          <div className="escolha-tipo">
            {(Object.keys(NOMES_TIPO_CADERNO) as TipoCaderno[]).map((t) => (
              <button key={t} type="button" className="botao-chip" aria-pressed={tipo === t} onClick={() => definirTipo(t)}>
                {NOMES_TIPO_CADERNO[t]}
              </button>
            ))}
          </div>
          <span className="campo-ajuda">
            {tipo === "curso" && "Aparece em Cursos. Use seções para os módulos."}
            {tipo === "livro" && "Aparece na Biblioteca. Uma página por capítulo, se quiser."}
            {tipo === "projeto" && "Para algo com começo e fim."}
            {tipo === "comum" && "Um caderno de assunto: receitas, ideias, finanças…"}
          </span>
        </fieldset>

        <label className="campo">
          <span className="campo-rotulo">Área</span>
          <select value={area} onChange={(e) => definirArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
                {a.arquivada ? " (arquivada)" : ""}
              </option>
            ))}
          </select>
        </label>

        {tipo !== "comum" && (
          <>
            <label className="campo">
              <span className="campo-rotulo">Situação</span>
              <select value={ficha.status ?? "andamento"} onChange={(e) => definirFicha((x) => ({ ...x, status: e.target.value as StatusCaderno }))}>
                {(Object.keys(status) as StatusCaderno[]).map((s) => (
                  <option key={s} value={s}>
                    {status[s]}
                  </option>
                ))}
              </select>
            </label>
            {tipo !== "projeto" && (
              <label className="campo">
                <span className="campo-rotulo">{tipo === "livro" ? "Autor" : "Professor(a)"}</span>
                <input value={ficha.autor ?? ""} onChange={(e) => f("autor", e.target.value)} />
              </label>
            )}
            {tipo === "curso" && (
              <label className="campo">
                <span className="campo-rotulo">Plataforma ou escola</span>
                <input value={ficha.plataforma ?? ""} onChange={(e) => f("plataforma", e.target.value)} />
              </label>
            )}
            <label className="campo">
              <span className="campo-rotulo">Link</span>
              <input type="url" inputMode="url" value={ficha.link ?? ""} onChange={(e) => f("link", e.target.value)} placeholder="https://…" />
            </label>
            <div className="campo-dupla">
              <label className="campo">
                <span className="campo-rotulo">Começo</span>
                <input type="date" value={ficha.inicio ?? ""} onChange={(e) => f("inicio", e.target.value)} />
              </label>
              <label className="campo">
                <span className="campo-rotulo">Fim</span>
                <input type="date" value={ficha.fim ?? ""} onChange={(e) => f("fim", e.target.value)} />
              </label>
            </div>
          </>
        )}

        <div className="modal-botoes">
          <button type="button" className="botao botao-leve" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" className="botao botao-principal" disabled={!nome.trim()}>
            {inicial ? "Salvar" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}
