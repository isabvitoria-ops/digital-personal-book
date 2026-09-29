/**
 * Os dois endereços próprios do caderno, dentro do Markdown:
 *   [Título](pagina:ID)   link para outra página
 *   [nome.pdf](anexo:ID)  arquivo guardado junto; imagem usa ![...](anexo:ID)
 */
const LINK_PAGINA = /\]\(pagina:([a-z0-9]+)\)/g;
const LINK_ANEXO = /\]\(anexo:([a-z0-9]+)\)/g;

export function paginasCitadas(md: string): string[] {
  return [...new Set([...md.matchAll(LINK_PAGINA)].map((m) => m[1]!))];
}

export function anexosCitados(md: string): string[] {
  return [...new Set([...md.matchAll(LINK_ANEXO)].map((m) => m[1]!))];
}

/** "Mencionada em": quem aponta para esta página. */
export function quemCita<T extends { id: string; conteudo: string }>(id: string, paginas: T[]): T[] {
  const alvo = `](pagina:${id})`;
  return paginas.filter((p) => p.id !== id && p.conteudo.includes(alvo));
}

/**
 * Troca os endereços próprios por outros — usado na exportação, que troca
 * `anexo:ID` e `pagina:ID` por caminhos de arquivo que qualquer programa abre.
 */
export function trocarEnderecos(
  md: string,
  troca: (tipo: "pagina" | "anexo", id: string) => string | null,
): string {
  return md.replace(/\]\((pagina|anexo):([a-z0-9]+)\)/g, (original, tipo: "pagina" | "anexo", id: string) => {
    const novo = troca(tipo, id);
    return novo === null ? original : `](${novo})`;
  });
}
