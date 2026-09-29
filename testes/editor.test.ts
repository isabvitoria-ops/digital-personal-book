// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { expect, test } from "vitest";
import { extensoesBase, extensoesDoEditor } from "../src/editor/extensoes";

/**
 * O Markdown é a única cópia das anotações. Se o editor mudar o texto a cada
 * vez que abre e salva, em um ano as páginas estariam deformadas. Aqui se
 * garante que abrir e salvar devolve o mesmo texto.
 */
const md = `# Título

Texto com **negrito**, *itálico*, ~~riscado~~, \`código\` e [site](https://exemplo.com).

Link para [Outra página](pagina:abc123) e anexo [artigo.pdf](anexo:x9y8).

## Lista

- um
- dois
  - dentro

1. primeiro
2. segundo

- [ ] fazer
- [x] feito

> citação importante

| Alimento | Qtd |
| --- | --- |
| Arroz | 100 g |

![foto](anexo:img001)

Caractere especial: 5 * 3 e a_b e [colchete].
`;

function idaEVolta(texto: string, ext = extensoesBase()) {
  const e = new Editor({ extensions: ext, content: texto, contentType: "markdown" });
  const saida = e.getMarkdown();
  e.destroy();
  return saida;
}

test("abrir e salvar não deforma o texto", () => {
  const primeira = idaEVolta(md);
  expect(idaEVolta(primeira)).toBe(primeira);
});

test("nada se perde na ida e volta", () => {
  const saida = idaEVolta(md);
  for (const pedaco of [
    "# Título",
    "**negrito**",
    "*itálico*",
    "~~riscado~~",
    "`código`",
    "[site](https://exemplo.com)",
    "[Outra página](pagina:abc123)",
    "[artigo.pdf](anexo:x9y8)",
    "  - dentro",
    "1. primeiro",
    "- [ ] fazer",
    "- [x] feito",
    "> citação importante",
    "| Arroz",
    "![foto](anexo:img001)",
  ]) {
    expect(saida).toContain(pedaco);
  }
});

test("o editor de verdade (com imagem de anexo) salva igual", () => {
  const ext = extensoesDoEditor(async () => null, "Escreva");
  expect(idaEVolta(md, ext)).toBe(idaEVolta(md));
});

test("link com endereço perigoso aparece na tela sem destino", () => {
  const e = new Editor({ extensions: extensoesBase(), content: "[x](javascript:alert(1)) [y](pagina:abc)", contentType: "markdown" });
  const html = e.getHTML();
  e.destroy();
  expect(html).not.toContain("javascript:");
  expect(html).toContain('href="pagina:abc"');
});
