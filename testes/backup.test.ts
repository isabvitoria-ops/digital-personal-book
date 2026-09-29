import { describe, expect, test } from "vitest";
import {
  caminhoDoAnexo,
  caminhoRelativo,
  caminhosDasPaginas,
  lerArquivoJson,
  montarArquivosDeTexto,
  planejarJuncao,
  type Pacote,
} from "../src/dados/backup";
import type { Caderno, Pagina } from "../src/dados/tipos";

const T0 = "2026-09-01T10:00:00.000Z";
const T1 = "2026-09-10T10:00:00.000Z";

function pagina(id: string, extra: Partial<Pagina> = {}): Pagina {
  return {
    id, cadernoId: null, secaoId: null, titulo: `Página ${id}`, conteudo: "", tipo: "nota",
    statusArtigo: null, fonte: "", marcadores: [], favorita: false, revisarEm: null,
    criadaEm: T0, atualizadaEm: T0, abertaEm: null, excluidaEm: null, ...extra,
  };
}

const curso: Caderno = {
  id: "cur1", areaId: "ar1", nome: "Curso: Microbiota", tipo: "curso", ficha: {}, secoes: [{ id: "s1", nome: "Módulo 1" }],
  ordenacao: "criacao", ordem: 1, arquivado: false, criadoEm: T0, atualizadoEm: T0,
};

const pacote: Pacote = {
  areas: [{ id: "ar1", nome: "Nutrição & Saúde", ordem: 1, arquivada: false, criadaEm: T0, atualizadaEm: T0 }],
  cadernos: [curso],
  paginas: [
    pagina("p1", { cadernoId: "cur1", secaoId: "s1", titulo: "Aula 1 (fibras)", conteudo: "Ver [nota](pagina:p2) e [exame.pdf](anexo:an1)." }),
    pagina("p2", { titulo: "Ideia solta" }),
    pagina("p3", { excluidaEm: T1, titulo: "Apagada" }),
  ],
  anexos: [{ id: "an1", paginaId: "p1", nome: "Exame de Sangue.PDF", tipo: "application/pdf", tamanho: 10, criadoEm: T0 }],
};

describe("caminhos", () => {
  test("cada página na pasta da sua organização, com o id no nome", () => {
    const c = caminhosDasPaginas(pacote);
    expect(c.get("p1")).toBe("Nutrição & Saúde/Curso Microbiota/Módulo 1/Aula 1 (fibras) - p1.md");
    expect(c.get("p2")).toBe("Inbox/Ideia solta - p2.md");
    expect(c.get("p3")).toBe("Lixeira/Inbox/Apagada - p3.md");
  });
  test("anexo mantém a extensão", () => {
    expect(caminhoDoAnexo({ id: "an1", nome: "Exame de Sangue.PDF" })).toBe("anexos/an1-Exame de Sangue.pdf");
    expect(caminhoDoAnexo({ id: "x", nome: "sem extensao" })).toBe("anexos/x-sem extensao");
  });
  test("caminho relativo, com espaço e parênteses escapados", () => {
    expect(caminhoRelativo("A/B/C/p.md", "Inbox/n (1).md")).toBe("../../../Inbox/n%20%281%29.md");
    expect(caminhoRelativo("A/B/p.md", "A/B/q.md")).toBe("q.md");
    expect(caminhoRelativo("Inbox/p.md", "anexos/x.pdf")).toBe("../anexos/x.pdf");
  });
});

describe("arquivos de texto", () => {
  const arquivos = montarArquivosDeTexto(pacote, T1);
  const porCaminho = new Map(arquivos.map((a) => [a.caminho, a.conteudo]));

  test("tem LEIA-ME, caderno.json e um .md por página", () => {
    expect(porCaminho.has("LEIA-ME.txt")).toBe(true);
    expect(porCaminho.has("caderno.json")).toBe(true);
    expect(arquivos.filter((a) => a.caminho.endsWith(".md"))).toHaveLength(3);
  });

  test("o .md tem as informações no topo e links que qualquer programa abre", () => {
    const md = porCaminho.get("Nutrição & Saúde/Curso Microbiota/Módulo 1/Aula 1 (fibras) - p1.md")!;
    expect(md.startsWith("---\nid: \"p1\"\ntitulo: \"Aula 1 (fibras)\"")).toBe(true);
    expect(md).toContain("# Aula 1 (fibras)");
    expect(md).toContain("[nota](../../../Inbox/Ideia%20solta%20-%20p2.md)");
    expect(md).toContain("[exame.pdf](../../../anexos/an1-Exame%20de%20Sangue.pdf)");
    expect(md).not.toContain("pagina:");
  });

  test("o caderno.json volta igual", () => {
    const json = lerArquivoJson(porCaminho.get("caderno.json")!);
    expect(json.paginas).toEqual(pacote.paginas);
    expect(json.exportadoEm).toBe(T1);
  });
});

describe("lerArquivoJson", () => {
  test("recusa o que não é backup", () => {
    expect(() => lerArquivoJson("{")).toThrow(/danificado/);
    expect(() => lerArquivoJson('{"formato":"outro"}')).toThrow(/não é um backup/);
    expect(() => lerArquivoJson('{"formato":"caderno-pessoal","versao":2}')).toThrow(/versão mais nova/);
  });
});

describe("juntar", () => {
  test("aparelho vazio recebe tudo", () => {
    const plano = planejarJuncao({ areas: [], cadernos: [], paginas: [], anexos: [] }, pacote);
    expect(plano.paginas).toHaveLength(3);
    expect(plano.anexos).toHaveLength(1);
    expect(plano.resumo).toEqual({ novas: 3, atualizadas: 0, iguais: 0 });
  });

  test("vence a versão editada por último; nada local é apagado", () => {
    const local: Pacote = {
      ...pacote,
      paginas: [
        pagina("p1", { cadernoId: "cur1", conteudo: "local mais novo", atualizadaEm: T1 }),
        pagina("p2", { conteudo: "local mais velho", atualizadaEm: "2026-08-01T00:00:00.000Z" }),
        pagina("so-local"),
      ],
    };
    const plano = planejarJuncao(local, pacote);
    expect(plano.paginas.map((p) => p.id).sort()).toEqual(["p2", "p3"]);
    expect(plano.resumo).toEqual({ novas: 1, atualizadas: 1, iguais: 1 });
    expect(plano.anexos).toHaveLength(0);
  });

  test("página de caderno que não existe em lugar nenhum cai na Inbox", () => {
    const vindo: Pacote = { areas: [], cadernos: [], paginas: [pagina("x", { cadernoId: "sumiu", secaoId: "s" })], anexos: [] };
    const plano = planejarJuncao({ areas: [], cadernos: [], paginas: [], anexos: [] }, vindo);
    expect(plano.paginas[0]).toMatchObject({ cadernoId: null, secaoId: null });
  });
});
