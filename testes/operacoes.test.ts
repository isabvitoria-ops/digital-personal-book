import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import { BancoDoCaderno, db, trocarBanco } from "../src/dados/banco";
import {
  apagarArea,
  apagarCaderno,
  apagarParaSempre,
  atualizarPagina,
  criarArea,
  criarAreasSugeridas,
  criarCaderno,
  criarPagina,
  criarSecao,
  descartarSeVazia,
  guardarAnexo,
  mandarParaLixeira,
  marcarAberta,
  moverPagina,
  removerSecao,
} from "../src/dados/operacoes";

let n = 0;
beforeEach(() => {
  trocarBanco(new BancoDoCaderno(`teste-${++n}`));
});

test("nova anotação nasce na Inbox", async () => {
  const p = await criarPagina();
  expect(p.cadernoId).toBeNull();
  expect((await db.paginas.get(p.id))?.titulo).toBe("");
});

test("áreas sugeridas só entram num caderno vazio", async () => {
  await criarAreasSugeridas();
  await criarAreasSugeridas();
  expect(await db.areas.count()).toBe(6);
});

test("curso nasce em ordem de criação e com status", async () => {
  const a = await criarArea("Nutrição");
  const c = await criarCaderno(a.id, "Microbiota", "curso");
  expect(c.ordenacao).toBe("criacao");
  expect(c.ficha.status).toBe("andamento");
  const comum = await criarCaderno(a.id, "Receitas", "comum");
  expect(comum.ordenacao).toBe("recentes");
});

test("área e caderno com conteúdo não se apagam", async () => {
  const a = await criarArea("X");
  const c = await criarCaderno(a.id, "Y", "comum");
  expect(await apagarArea(a.id)).toBe(false);
  const p = await criarPagina({ cadernoId: c.id });
  expect(await apagarCaderno(c.id)).toBe(false);
  await mandarParaLixeira(p.id);
  expect(await apagarCaderno(c.id)).toBe(false); // nem com a página na lixeira
  await apagarParaSempre(p.id);
  expect(await apagarCaderno(c.id)).toBe(true);
  expect(await apagarArea(a.id)).toBe(true);
});

test("tirar a seção devolve as páginas para 'sem seção'", async () => {
  const a = await criarArea("X");
  let c = await criarCaderno(a.id, "Curso", "curso");
  await criarSecao(c, "Módulo 1");
  c = (await db.cadernos.get(c.id))!;
  const secao = c.secoes[0]!;
  const p = await criarPagina({ cadernoId: c.id, secaoId: secao.id });
  await removerSecao(c, secao.id);
  expect((await db.paginas.get(p.id))?.secaoId).toBeNull();
  expect((await db.cadernos.get(c.id))?.secoes).toEqual([]);
});

test("mover para a Inbox limpa a seção", async () => {
  const a = await criarArea("X");
  const c = await criarCaderno(a.id, "C", "comum");
  const p = await criarPagina({ cadernoId: c.id, secaoId: "s1" });
  await moverPagina(p.id, null, "s1");
  expect(await db.paginas.get(p.id)).toMatchObject({ cadernoId: null, secaoId: null });
});

test("abrir não conta como editar", async () => {
  const p = await criarPagina();
  expect(p.abertaEm).toBeNull();
  await new Promise((r) => setTimeout(r, 5));
  await marcarAberta(p.id);
  const depois = (await db.paginas.get(p.id))!;
  expect(depois.atualizadaEm).toBe(p.atualizadaEm);
  expect(depois.abertaEm! > p.criadaEm).toBe(true);
});

test("página vazia abandonada some; com qualquer coisa escrita, fica", async () => {
  const vazia = await criarPagina();
  await atualizarPagina(vazia.id, { conteudo: "&nbsp;\n\n" });
  expect(await descartarSeVazia(vazia.id)).toBe(true);
  expect(await db.paginas.get(vazia.id)).toBeUndefined();

  const comTitulo = await criarPagina();
  await atualizarPagina(comTitulo.id, { titulo: "Ideia" });
  expect(await descartarSeVazia(comTitulo.id)).toBe(false);

  const comAnexo = await criarPagina();
  await guardarAnexo(comAnexo.id, new Blob(["pdf"], { type: "application/pdf" }), "a.pdf");
  expect(await descartarSeVazia(comAnexo.id)).toBe(false);
});

test("apagar para sempre leva os anexos junto", async () => {
  const p = await criarPagina();
  await guardarAnexo(p.id, new Blob(["x"]), "x.txt");
  await apagarParaSempre(p.id);
  expect(await db.anexos.count()).toBe(0);
});
