import { Marked, type Tokens } from "marked";

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Markdown → HTML, para imprimir e salvar em PDF.
 *
 * HTML escrito à mão dentro do texto aparece como texto (não é executado), e
 * só link http/https/mailto vira link de verdade. Os endereços do caderno:
 *   anexo:ID   vira o endereço do arquivo, via `anexo(id)`
 *   pagina:ID  vira texto sublinhado (no papel não há para onde clicar)
 */
export function markdownParaHtml(md: string, anexo: (id: string) => string | null): string {
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapar(token.text);
      },
      link(token: Tokens.Link) {
        const texto = this.parser.parseInline(token.tokens);
        const href = token.href ?? "";
        if (href.startsWith("pagina:")) return `<span class="link-pagina">${texto}</span>`;
        if (href.startsWith("anexo:")) {
          const url = anexo(href.slice(6));
          return url ? `<a href="${escapar(url)}">${texto}</a>` : texto;
        }
        if (/^(https?:|mailto:)/i.test(href)) return `<a href="${escapar(href)}">${texto}</a>`;
        return texto;
      },
      image(token: Tokens.Image) {
        const href = token.href ?? "";
        const url = href.startsWith("anexo:") ? anexo(href.slice(6)) : /^https?:/i.test(href) ? href : null;
        return url ? `<img src="${escapar(url)}" alt="${escapar(token.text ?? "")}">` : "";
      },
    },
  });
  return marked.parse(md, { async: false }) as string;
}
