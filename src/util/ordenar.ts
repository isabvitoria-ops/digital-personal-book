import type { Ordenacao, Pagina } from "../dados/tipos";
import { tituloVisivel } from "./texto";

export const NOMES_ORDENACAO: Record<Ordenacao, string> = {
  recentes: "Mais recentes primeiro",
  criacao: "Na ordem em que foram criadas",
  alfabetica: "Em ordem alfabética",
};

export function ordenarPaginas(paginas: Pagina[], ordem: Ordenacao): Pagina[] {
  const copia = [...paginas];
  if (ordem === "recentes") return copia.sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  if (ordem === "criacao") return copia.sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
  return copia.sort((a, b) =>
    tituloVisivel(a.titulo, a.conteudo).localeCompare(tituloVisivel(b.titulo, b.conteudo), "pt-BR", { numeric: true }),
  );
}
