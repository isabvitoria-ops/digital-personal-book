import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { caminhoDaPagina, useDados } from "../app/Dados";
import { db } from "../dados/banco";
import { criarIndice, documentoDaPagina, termosDaBusca } from "../util/busca";
import { normalizar, textoSimples, tituloVisivel, trecho } from "../util/texto";
import { Icone } from "../componentes/Icone";
import { dataCurta } from "../util/datas";

/**
 * A busca é o que faz o caderno servir daqui a anos. Procura no título, no
 * texto, na fonte, no nome dos anexos e no nome do caderno — sem acento, sem
 * maiúscula, aceitando o começo da palavra e um errinho de digitação.
 */
export function Buscar() {
  const dados = useDados();
  const [parametros, definirParametros] = useSearchParams();
  const [consulta, definirConsulta] = useState(parametros.get("q") ?? "");
  const [areaId, definirAreaId] = useState("");
  const [tipo, definirTipo] = useState<"" | "nota" | "artigo">("");
  const [soFavoritas, definirSoFavoritas] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const nomesDeAnexos = useLiveQuery(async () => {
    const mapa = new Map<string, string[]>();
    await db.anexos.each((a) => mapa.set(a.paginaId, [...(mapa.get(a.paginaId) ?? []), a.nome]));
    return mapa;
  });

  useEffect(() => campo.current?.focus(), []);

  // Guarda a busca no endereço: voltar de uma página traz o resultado de volta.
  useEffect(() => {
    const t = window.setTimeout(() => definirParametros(consulta ? { q: consulta } : {}, { replace: true }), 300);
    return () => window.clearTimeout(t);
  }, [consulta, definirParametros]);

  const indice = useMemo(
    () =>
      criarIndice(
        dados.vivas.map((p) =>
          documentoDaPagina(p, caminhoDaPagina(p, dados).join(" "), nomesDeAnexos?.get(p.id) ?? []),
        ),
      ),
    [dados, nomesDeAnexos],
  );

  const termos = termosDaBusca(consulta);
  const resultados = useMemo(() => {
    if (termos.length === 0) return [];
    return indice
      .search(consulta)
      .map((r) => dados.paginaPorId.get(r.id as string)!)
      .filter(Boolean)
      .filter((p) => !tipo || p.tipo === tipo)
      .filter((p) => !soFavoritas || p.favorita)
      .filter((p) => {
        if (!areaId) return true;
        const c = p.cadernoId ? dados.cadernoPorId.get(p.cadernoId) : undefined;
        return areaId === "inbox" ? !c : c?.areaId === areaId;
      })
      .slice(0, 100);
  }, [indice, consulta, tipo, soFavoritas, areaId, dados]);

  return (
    <div className="tela">
      <h1 className="titulo-tela">Buscar</h1>
      <div className="campo-busca-grande">
        <Icone nome="buscar" />
        <input
          ref={campo}
          type="search"
          enterKeyHint="search"
          placeholder="Palavra, assunto, autor, nome do PDF…"
          value={consulta}
          onChange={(e) => definirConsulta(e.target.value)}
          aria-label="Buscar"
        />
      </div>

      <div className="filtros">
        <select value={areaId} onChange={(e) => definirAreaId(e.target.value)} aria-label="Área">
          <option value="">Todas as áreas</option>
          <option value="inbox">Inbox</option>
          {dados.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => definirTipo(e.target.value as typeof tipo)} aria-label="Tipo">
          <option value="">Notas e artigos</option>
          <option value="nota">Só notas</option>
          <option value="artigo">Só artigos</option>
        </select>
        <button type="button" className="botao-chip" aria-pressed={soFavoritas} onClick={() => definirSoFavoritas((f) => !f)}>
          <Icone nome="estrela" tamanho={15} cheio={soFavoritas} /> Favoritas
        </button>
      </div>

      {termos.length === 0 && (
        <p className="dica">
          Não precisa de acento nem de maiúscula: “nutricao” acha “Nutrição”. No computador, Ctrl+K abre a busca de
          qualquer lugar.
        </p>
      )}

      {termos.length > 0 && (
        <p className="contagem" aria-live="polite">
          {resultados.length === 0
            ? "Nada encontrado."
            : `${resultados.length === 100 ? "100+" : resultados.length} ${resultados.length === 1 ? "página" : "páginas"}`}
        </p>
      )}

      <ul className="lista">
        {resultados.map((p) => (
          <li key={p.id}>
            <Link to={`/pagina/${p.id}`} className="item item-busca">
              <span className="item-titulo">
                {p.favorita && <Icone nome="estrela" tamanho={14} cheio />}
                <Destaque texto={tituloVisivel(p.titulo, p.conteudo)} termos={termos} />
              </span>
              <span className="item-apoio">
                {caminhoDaPagina(p, dados).join(" › ")} · {dataCurta(p.atualizadaEm)}
              </span>
              <span className="item-trecho">
                <Destaque texto={trecho(textoSimples(p.conteudo), termos)} termos={termos} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Marca as palavras buscadas, achando sem acento mas mostrando com acento. */
function Destaque({ texto, termos }: { texto: string; termos: string[] }) {
  // Normaliza letra a letra para que as posições no texto normalizado e no
  // original sejam as mesmas.
  const plano = [...texto]
    .map((ch) => {
      const n = normalizar(ch);
      return n.length === ch.length ? n : ch;
    })
    .join("");
  const marcas = new Array<boolean>(texto.length).fill(false);
  for (const t of termos.map(normalizar).filter((t) => t.length >= 2)) {
    let i = plano.indexOf(t);
    while (i >= 0) {
      for (let k = i; k < i + t.length; k++) marcas[k] = true;
      i = plano.indexOf(t, i + t.length);
    }
  }
  const partes: { texto: string; marcado: boolean }[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.marcado === marcas[i]) ultima.texto += texto[i];
    else partes.push({ texto: texto[i]!, marcado: marcas[i]! });
  }
  return (
    <>
      {partes.map((p, i) => (p.marcado ? <mark key={i}>{p.texto}</mark> : <span key={i}>{p.texto}</span>))}
    </>
  );
}
