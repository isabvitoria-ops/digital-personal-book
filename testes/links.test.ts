import { expect, test } from "vitest";
import { anexosCitados, paginasCitadas, quemCita, trocarEnderecos } from "../src/util/links";

const md = "Veja [Aula 1](pagina:abc123) e [Aula 2](pagina:def456), de novo [Aula 1](pagina:abc123). PDF: [exame.pdf](anexo:zz9) ![f](anexo:img1) e [site](https://x.com).";

test("acha páginas e anexos citados, sem repetir", () => {
  expect(paginasCitadas(md)).toEqual(["abc123", "def456"]);
  expect(anexosCitados(md)).toEqual(["zz9", "img1"]);
});

test("quem cita esta página (e não ela mesma)", () => {
  const paginas = [
    { id: "p1", conteudo: md },
    { id: "abc123", conteudo: "[eu](pagina:abc123)" },
    { id: "p3", conteudo: "nada aqui, abc123 solto não conta" },
  ];
  expect(quemCita("abc123", paginas).map((p) => p.id)).toEqual(["p1"]);
});

test("troca endereços; null mantém o original", () => {
  const saida = trocarEnderecos(md, (tipo, id) => (tipo === "anexo" ? `arq/${id}` : id === "abc123" ? "a1.md" : null));
  expect(saida).toContain("[Aula 1](a1.md)");
  expect(saida).toContain("[Aula 2](pagina:def456)");
  expect(saida).toContain("[exame.pdf](arq/zz9)");
  expect(saida).toContain("[site](https://x.com)");
});
