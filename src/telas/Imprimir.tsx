import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDados } from "../app/Dados";
import type { Pagina } from "../dados/tipos";
import { enderecoDoAnexo } from "../editor/anexos";
import { anexosCitados } from "../util/links";
import { markdownParaHtml } from "../util/html";
import { ordenarPaginas } from "../util/ordenar";
import { dataCompleta } from "../util/datas";
import { tituloVisivel } from "../util/texto";

/**
 * A versão para papel (ou PDF): sem menu, sem botão, só o texto. O "Salvar
 * como PDF" é o do próprio navegador — funciona igual no celular e no
 * computador, sem biblioteca a mais.
 */
export function Imprimir() {
  const { tipo, id = "" } = useParams();
  const dados = useDados();
  const navegar = useNavigate();
  const [enderecos, definirEnderecos] = useState<Map<string, string> | null>(null);

  let titulo = "";
  let blocos: { secao?: string; paginas: Pagina[] }[] = [];
  if (tipo === "pagina") {
    const p = dados.paginaPorId.get(id);
    if (p) {
      titulo = tituloVisivel(p.titulo, p.conteudo);
      blocos = [{ paginas: [p] }];
    }
  } else {
    const c = dados.cadernoPorId.get(id);
    if (c) {
      titulo = c.nome;
      const todas = ordenarPaginas(dados.vivas.filter((p) => p.cadernoId === c.id), c.ordenacao === "recentes" ? "criacao" : c.ordenacao);
      const ids = new Set(c.secoes.map((s) => s.id));
      blocos = [
        { paginas: todas.filter((p) => !p.secaoId || !ids.has(p.secaoId)) },
        ...c.secoes.map((s) => ({ secao: s.nome, paginas: todas.filter((p) => p.secaoId === s.id) })),
      ].filter((b) => b.paginas.length > 0);
    }
  }
  const paginas = blocos.flatMap((b) => b.paginas);
  const chave = paginas.map((p) => p.id + p.atualizadaEm).join();

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const mapa = new Map<string, string>();
      for (const aid of new Set(paginas.flatMap((p) => anexosCitados(p.conteudo)))) {
        const url = await enderecoDoAnexo(aid);
        if (url) mapa.set(aid, url);
      }
      if (vivo) definirEnderecos(mapa);
    })();
    return () => {
      vivo = false;
    };
  }, [chave]);

  useEffect(() => {
    const antes = document.title;
    if (titulo) document.title = titulo;
    return () => {
      document.title = antes;
    };
  }, [titulo]);

  if (paginas.length === 0) {
    return (
      <div className="tela">
        <p className="vazio">Nada para imprimir.</p>
        <button type="button" className="botao botao-leve" onClick={() => navegar(-1)}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="impressao">
      <div className="impressao-barra nao-imprimir">
        <button type="button" className="botao botao-leve" onClick={() => navegar(-1)}>
          Voltar
        </button>
        <button type="button" className="botao botao-principal" onClick={() => window.print()} disabled={!enderecos}>
          Imprimir ou salvar PDF
        </button>
      </div>
      <p className="impressao-dica nao-imprimir">
        Para PDF: na janela que abrir, escolha “Salvar como PDF” (no iPhone: compartilhar → Salvar em Arquivos).
      </p>

      {tipo === "caderno" && <h1 className="impressao-titulo-caderno">{titulo}</h1>}
      {enderecos &&
        blocos.map((b, i) => (
          <section key={i}>
            {b.secao && <h2 className="impressao-secao">{b.secao}</h2>}
            {b.paginas.map((p) => (
              <article key={p.id} className="impressao-pagina">
                <h1>{tituloVisivel(p.titulo, p.conteudo)}</h1>
                <p className="impressao-data">Atualizada em {dataCompleta(p.atualizadaEm)}</p>
                <div
                  className="texto-da-pagina"
                  dangerouslySetInnerHTML={{ __html: markdownParaHtml(p.conteudo, (aid) => enderecos.get(aid) ?? null) }}
                />
              </article>
            ))}
          </section>
        ))}
    </div>
  );
}
