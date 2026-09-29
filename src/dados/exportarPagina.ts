import type { Pagina } from "./tipos";

/**
 * Uma página sozinha, fora do caderno: os links para outras páginas e
 * anexos não teriam para onde apontar, então viram só o texto deles.
 */
export function paginaAvulsaEmMarkdown(p: Pagina): string {
  const corpo = p.conteudo.replace(/!?\[([^\]]*)\]\((?:pagina|anexo):[a-z0-9]+\)/g, "$1");
  const titulo = p.titulo.trim() ? `# ${p.titulo.trim()}\n\n` : "";
  return `${titulo}${corpo.trim()}\n`;
}
