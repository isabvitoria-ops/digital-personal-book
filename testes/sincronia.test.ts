import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BancoDoCaderno, db, trocarBanco } from "../src/dados/banco";
import {
  apagarParaSempre,
  atualizarPagina,
  criarArea,
  criarCaderno,
  criarPagina,
  guardarAnexo,
} from "../src/dados/operacoes";
import { arquivoParaPagina, montarIndice, paginaParaArquivo } from "../src/sincronia/formato";
import { sincronizar } from "../src/sincronia/sincronizar";
import { RemotoEmMemoria } from "../src/sincronia/memoria";
import { RemotoGitHub } from "../src/sincronia/github";
import type { Pagina } from "../src/dados/tipos";

let n = 0;
function aparelho() {
  return new BancoDoCaderno(`aparelho-${++n}`);
}
/** Troca de "aparelho" — as operações usam o banco ativo. */
function em(b: BancoDoCaderno) {
  trocarBanco(b);
}
const espera = () => new Promise((r) => setTimeout(r, 3));

describe("formato do arquivo da página", () => {
  test("vai e volta igual (menos 'aberta em', que é de cada aparelho)", () => {
    const p: Pagina = {
      id: "abc", cadernoId: "c1", secaoId: null, titulo: 'Aula 1: "fibras" — ok', conteudo: "# X\n\n- [ ] a\n\n[b](pagina:zz)",
      tipo: "artigo", statusArtigo: "lido", fonte: "https://x.org", marcadores: ["ideia"], favorita: true,
      revisarEm: "2026-10-01", criadaEm: "2026-09-01T00:00:00.000Z", atualizadaEm: "2026-09-02T00:00:00.000Z",
      abertaEm: "2026-09-03T00:00:00.000Z", excluidaEm: null,
    };
    const { abertaEm: _a, ...resto } = p;
    expect(arquivoParaPagina(paginaParaArquivo(p))).toEqual(resto);
  });

  test("conteúdo que começa com --- não confunde o cabeçalho", () => {
    const p = { id: "x", titulo: "", conteudo: "---\nlinha\n---", atualizadaEm: "t", criadaEm: "t" } as Pagina;
    expect(arquivoParaPagina(paginaParaArquivo(p)).conteudo).toBe("---\nlinha\n---");
  });

  test("índice por área e caderno", () => {
    const idx = montarIndice(
      { areas: [{ id: "a", nome: "Nutrição", ordem: 1, arquivada: false, criadaEm: "", atualizadaEm: "" }],
        cadernos: [{ id: "c", areaId: "a", nome: "Microbiota", tipo: "curso", ficha: {}, secoes: [{ id: "s", nome: "Módulo 1" }], ordenacao: "criacao", ordem: 1, arquivado: false, criadoEm: "", atualizadoEm: "" }] },
      [
        { id: "p1", titulo: "Aula 1", cadernoId: "c", secaoId: "s", excluidaEm: null },
        { id: "p2", titulo: "Ideia", cadernoId: null, secaoId: null, excluidaEm: null },
        { id: "p3", titulo: "Lixo", cadernoId: null, secaoId: null, excluidaEm: "x" },
      ],
    );
    expect(idx).toContain("## Inbox\n\n- [Ideia](paginas/p2.md)");
    expect(idx).toContain("## Nutrição");
    expect(idx).toContain("**Módulo 1**\n\n- [Aula 1](paginas/p1.md)");
    expect(idx).not.toContain("Lixo");
  });
});

describe("dois aparelhos, um repositório", () => {
  let remoto: RemotoEmMemoria;
  let celular: BancoDoCaderno;
  let computador: BancoDoCaderno;

  beforeEach(() => {
    remoto = new RemotoEmMemoria();
    celular = aparelho();
    computador = aparelho();
  });

  test("o que um cria, o outro recebe — com anexo e tudo", async () => {
    em(celular);
    const area = await criarArea("Nutrição");
    const caderno = await criarCaderno(area.id, "Microbiota", "curso");
    const p = await criarPagina({ cadernoId: caderno.id });
    await atualizarPagina(p.id, { titulo: "Aula 1", conteudo: "Fibras e [pdf](anexo:x)" });
    const anexo = await guardarAnexo(p.id, new Blob([new Uint8Array([1, 2, 3, 250])], { type: "application/pdf" }), "artigo.pdf");
    const r1 = await sincronizar(remoto);
    expect(r1).toMatchObject({ enviadas: 1, anexosEnviados: 1, gravouRemoto: true });
    expect(remoto.caminhos()).toEqual(
      ["INDICE.md", "LEIA-ME.md", "anexos/" + anexo.id + "/artigo.pdf", "estrutura.json", "paginas/" + p.id + ".md", "sincronia.json"].sort(),
    );

    em(computador);
    const r2 = await sincronizar(remoto);
    expect(r2).toMatchObject({ recebidas: 1, anexosRecebidos: 1 });
    const recebida = await db.paginas.get(p.id);
    expect(recebida).toMatchObject({ titulo: "Aula 1", conteudo: "Fibras e [pdf](anexo:x)", cadernoId: caderno.id });
    expect(await db.cadernos.get(caderno.id)).toMatchObject({ nome: "Microbiota", tipo: "curso" });
    const blob = (await db.anexos.get(anexo.id))!.dados;
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3, 250]);

    // Nada mudou: sincronizar de novo não cria commit.
    const antes = remoto.commits;
    const r3 = await sincronizar(remoto);
    expect(r3.gravouRemoto).toBe(false);
    expect(remoto.commits).toBe(antes);
  });

  test("a mesma página editada nos dois: vence a editada por último", async () => {
    em(celular);
    const p = await criarPagina();
    await atualizarPagina(p.id, { conteudo: "original" });
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);

    await espera();
    em(celular);
    await atualizarPagina(p.id, { conteudo: "do celular" });
    await espera();
    em(computador);
    await atualizarPagina(p.id, { conteudo: "do computador (mais nova)" });

    em(celular);
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    em(celular);
    await sincronizar(remoto);

    expect((await celular.paginas.get(p.id))?.conteudo).toBe("do computador (mais nova)");
    expect((await computador.paginas.get(p.id))?.conteudo).toBe("do computador (mais nova)");
  });

  test("páginas diferentes editadas nos dois: nada se perde", async () => {
    em(celular);
    const a = await criarPagina();
    await atualizarPagina(a.id, { titulo: "A" });
    em(computador);
    const b = await criarPagina();
    await atualizarPagina(b.id, { titulo: "B" });
    em(celular);
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    em(celular);
    await sincronizar(remoto);
    for (const aparelho of [celular, computador]) {
      expect((await aparelho.paginas.toArray()).map((p) => p.titulo).sort()).toEqual(["A", "B"]);
    }
  });

  test("apagada para sempre num aparelho some do outro (e do repositório)", async () => {
    em(celular);
    const p = await criarPagina();
    await atualizarPagina(p.id, { titulo: "Vai sumir" });
    await guardarAnexo(p.id, new Blob(["x"]), "a.txt");
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    expect(await computador.paginas.count()).toBe(1);

    em(celular);
    await apagarParaSempre(p.id);
    await sincronizar(remoto);
    expect(remoto.caminhos().filter((c) => c.startsWith("paginas/") || c.startsWith("anexos/"))).toEqual([]);

    em(computador);
    const r = await sincronizar(remoto);
    expect(r.apagados).toBe(2);
    expect(await computador.paginas.count()).toBe(0);
    expect(await computador.anexos.count()).toBe(0);
  });

  test("lixeira (não apagada) também sincroniza", async () => {
    em(celular);
    const p = await criarPagina();
    await atualizarPagina(p.id, { titulo: "x" });
    await sincronizar(remoto);
    await espera();
    await atualizarPagina(p.id, { excluidaEm: new Date().toISOString() });
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    expect((await computador.paginas.get(p.id))?.excluidaEm).not.toBeNull();
  });

  test("outro aparelho gravou no meio: recomeça e junta tudo", async () => {
    em(celular);
    const a = await criarPagina();
    await atualizarPagina(a.id, { titulo: "do celular" });
    em(computador);
    const b = await criarPagina();
    await atualizarPagina(b.id, { titulo: "do computador" });

    em(celular);
    remoto.antesDeGravar = async () => {
      em(computador);
      await sincronizar(remoto);
      em(celular);
    };
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    for (const aparelho of [celular, computador]) {
      expect((await aparelho.paginas.toArray()).map((p) => p.titulo).sort()).toEqual(["do celular", "do computador"]);
    }
  });

  test("área renomeada no outro aparelho chega aqui", async () => {
    em(celular);
    const area = await criarArea("Nutricao");
    await sincronizar(remoto);
    em(computador);
    await sincronizar(remoto);
    await espera();
    await computador.areas.update(area.id, { nome: "Nutrição & Saúde", atualizadaEm: new Date().toISOString() });
    await sincronizar(remoto);
    em(celular);
    await sincronizar(remoto);
    expect((await celular.areas.get(area.id))?.nome).toBe("Nutrição & Saúde");
  });
});

describe("trava de segurança do GitHub", () => {
  test("recusa repositório público", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ private: false, default_branch: "main" }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await expect(new RemotoGitHub("ela/caderno", "t").conferir()).rejects.toThrow(/PÚBLICO/);
    vi.unstubAllGlobals();
  });

  test("chave recusada vira mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(new RemotoGitHub("ela/caderno", "t").conferir()).rejects.toThrow(/chave do GitHub foi recusada/);
    vi.unstubAllGlobals();
  });
});
