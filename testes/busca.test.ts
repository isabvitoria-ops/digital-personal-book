import { expect, test } from "vitest";
import { criarIndice, type DocumentoDeBusca } from "../src/util/busca";

const doc = (id: string, titulo: string, texto: string, extra: Partial<DocumentoDeBusca> = {}): DocumentoDeBusca => ({
  id, titulo, texto, fonte: "", anexos: "", caminho: "", ...extra,
});

const indice = criarIndice([
  doc("1", "Proteína vegetal", "Leguminosas, soja e combinações de aminoácidos."),
  doc("2", "Reunião com contador", "Imposto de renda, carnê-leão e nutrição não aparece aqui? aparece: nutrição."),
  doc("3", "Aula 4 — Microbiota", "Fibras fermentáveis e ácidos graxos de cadeia curta.", { anexos: "artigo-butirato.pdf", caminho: "Nutrição & Saúde / Curso de Microbiota" }),
]);

const ids = (q: string) => indice.search(q).map((r) => r.id);

test("acha sem acento e sem maiúscula", () => {
  expect(ids("proteina")).toEqual(["1"]);
  expect(ids("ACIDOS GRAXOS")).toEqual(["3"]);
});

test("acha pelo começo da palavra, enquanto digita", () => {
  expect(ids("legum")).toEqual(["1"]);
});

test("tolera um erro de digitação em palavra longa", () => {
  expect(ids("microbiotta")).toEqual(["3"]);
});

test("todas as palavras precisam estar na página", () => {
  expect(ids("fibras soja")).toEqual([]);
});

test("acha pelo nome do anexo e pelo caderno", () => {
  expect(ids("butirato")).toEqual(["3"]);
  expect(ids("curso microbiota fibras")).toEqual(["3"]);
});

test("título pesa mais que o texto", () => {
  const i = criarIndice([
    doc("a", "Anotações soltas", "falei de nutrição de passagem"),
    doc("b", "Nutrição esportiva", "outra coisa"),
  ]);
  expect(i.search("nutricao")[0]!.id).toBe("b");
});
