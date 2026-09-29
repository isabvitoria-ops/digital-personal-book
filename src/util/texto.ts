/**
 * Tira acento e maiúscula: "Nutrição" e "nutricao" viram a mesma coisa.
 * É o que faz a busca achar o que ela digitou com pressa no celular.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * O texto de uma página sem a marcação do Markdown — para a busca e para o
 * trecho que aparece no resultado. Não precisa ser perfeito, precisa não
 * mostrar "**" e "](pagina:abc)" para ela.
 */
export function textoSimples(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (bloco) => bloco.replace(/```\w*/g, " "))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, "")
    .replace(/\|/g, " ")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/(^|[^\w\\])[*_](\S[^*_]*?)[*_](?=[^\w]|$)/g, "$1$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * O pedacinho do texto onde a palavra aparece, para ela reconhecer a página
 * no resultado da busca sem abrir. Procura ignorando acento, mas devolve o
 * texto original (com acento).
 */
export function trecho(texto: string, termos: string[], tamanho = 140): string {
  const plano = texto.replace(/\s+/g, " ").trim();
  if (!plano) return "";
  const norm = normalizar(plano);
  let pos = -1;
  for (const t of termos) {
    const p = norm.indexOf(normalizar(t));
    if (p >= 0 && (pos < 0 || p < pos)) pos = p;
  }
  if (pos < 0) return plano.length > tamanho ? plano.slice(0, tamanho).trimEnd() + "…" : plano;
  const inicio = Math.max(0, pos - Math.floor(tamanho / 3));
  const fim = Math.min(plano.length, inicio + tamanho);
  return (inicio > 0 ? "…" : "") + plano.slice(inicio, fim).trim() + (fim < plano.length ? "…" : "");
}

/** Um nome de arquivo que funciona em Windows, Mac, Linux e celular. */
export function nomeDeArquivo(texto: string, max = 60): string {
  const limpo = texto
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  const cortado = limpo.slice(0, max).trim();
  return cortado || "sem-titulo";
}

/** O que aparece quando a página não tem título: a primeira linha do texto. */
export function tituloVisivel(titulo: string, conteudo: string): string {
  if (titulo.trim()) return titulo.trim();
  const primeira = textoSimples(conteudo).split("\n")[0]?.trim() ?? "";
  if (!primeira) return "Sem título";
  return primeira.length > 60 ? primeira.slice(0, 60).trimEnd() + "…" : primeira;
}
