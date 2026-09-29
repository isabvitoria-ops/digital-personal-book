import { expect, test } from "vitest";
import { markdownParaHtml } from "../src/util/html";

const anexo = (id: string) => (id === "a1" ? "blob:x/a1" : null);

test("formatação comum vira HTML", () => {
  const html = markdownParaHtml("# T\n\n**b** e [site](https://x.com)\n\n- [x] feito\n\n| a | b |\n|---|---|\n| 1 | 2 |", anexo);
  expect(html).toContain("<h1>T</h1>");
  expect(html).toContain("<strong>b</strong>");
  expect(html).toContain('<a href="https://x.com">site</a>');
  expect(html).toContain("checkbox");
  expect(html).toContain("<table>");
});

test("endereços do caderno", () => {
  const html = markdownParaHtml("[Aula](pagina:p1) [pdf](anexo:a1) [sumiu](anexo:zz) ![f](anexo:a1)", anexo);
  expect(html).toContain('<span class="link-pagina">Aula</span>');
  expect(html).toContain('<a href="blob:x/a1">pdf</a>');
  expect(html).toContain("sumiu");
  expect(html).not.toContain("anexo:zz");
  expect(html).toContain('<img src="blob:x/a1" alt="f">');
});

test("nada de script nem javascript:", () => {
  const html = markdownParaHtml('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))', anexo);
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<img src=x");
  expect(html).not.toContain("javascript:");
});
