import MiniSearch from "minisearch";
import type { Pagina } from "../dados/tipos";
import { normalizar, textoSimples } from "./texto";

export interface DocumentoDeBusca {
  id: string;
  titulo: string;
  texto: string;
  fonte: string;
  anexos: string;
  caminho: string;
}

/**
 * O índice de busca. Três escolhas que importam:
 *   - sem acento e sem maiúscula dos dois lados (processTerm);
 *   - prefixo: "carb" já acha "carboidrato" enquanto ela digita;
 *   - tolera um erro de digitação em palavras de 5+ letras (fuzzy).
 * O título pesa mais que o texto: quem lembra do título quer aquela página.
 */
export function criarIndice(docs: DocumentoDeBusca[]) {
  const indice = new MiniSearch<DocumentoDeBusca>({
    fields: ["titulo", "texto", "fonte", "anexos", "caminho"],
    storeFields: ["id"],
    processTerm: (termo) => {
      const t = normalizar(termo);
      return t.length > 0 ? t : null;
    },
    searchOptions: {
      boost: { titulo: 4, caminho: 1.5, anexos: 1.5 },
      prefix: true,
      fuzzy: (termo) => (termo.length >= 5 ? 0.2 : false),
      combineWith: "AND",
    },
  });
  indice.addAll(docs);
  return indice;
}

export function documentoDaPagina(p: Pagina, caminho: string, nomesAnexos: string[]): DocumentoDeBusca {
  return {
    id: p.id,
    titulo: p.titulo,
    texto: textoSimples(p.conteudo),
    fonte: p.fonte,
    anexos: nomesAnexos.join(" "),
    caminho,
  };
}

export function termosDaBusca(consulta: string): string[] {
  return consulta.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}
