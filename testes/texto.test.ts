import { describe, expect, test } from "vitest";
import { nomeDeArquivo, normalizar, textoSimples, tituloVisivel, trecho } from "../src/util/texto";

describe("normalizar", () => {
  test("tira acento e maiúscula", () => {
    expect(normalizar("Nutrição Funcional")).toBe("nutricao funcional");
    expect(normalizar("AÇAÍ é Ótimo")).toBe("acai e otimo");
  });
});

describe("textoSimples", () => {
  test("some a marcação, fica o texto", () => {
    const md = "# Título\n\nTexto com **negrito** e [link](pagina:abc) e ![foto](anexo:x).\n\n- [ ] tarefa\n- item\n\n> citação\n\n| A | B |\n| --- | --- |\n| 1 | 2 |";
    const t = textoSimples(md);
    expect(t).toContain("Título");
    expect(t).toContain("Texto com negrito e link e foto.");
    expect(t).toContain("tarefa");
    expect(t).toContain("citação");
    expect(t).not.toMatch(/\*\*|pagina:|anexo:|---|\[ \]/);
  });
  test("desfaz o escape do editor", () => {
    expect(textoSimples("5 \\* 3 e a\\_b")).toBe("5 * 3 e a_b");
  });
  test("texto vazio", () => {
    expect(textoSimples("")).toBe("");
  });
});

describe("trecho", () => {
  const texto = "Começo do texto. ".repeat(10) + "Aqui fala de proteína vegetal e leguminosas. " + "Fim. ".repeat(20);
  test("mostra em volta da palavra, achando sem acento", () => {
    const t = trecho(texto, ["proteina"]);
    expect(t).toContain("proteína vegetal");
    expect(t.startsWith("…")).toBe(true);
    expect(t.endsWith("…")).toBe(true);
  });
  test("sem achar, mostra o começo", () => {
    expect(trecho("curto", ["zzz"])).toBe("curto");
  });
});

describe("nomeDeArquivo", () => {
  test("tira caractere proibido e mantém acento", () => {
    expect(nomeDeArquivo('Aula 1: "Carboidratos" / fibras?')).toBe("Aula 1 Carboidratos fibras");
  });
  test("vazio vira sem-titulo", () => {
    expect(nomeDeArquivo("   ")).toBe("sem-titulo");
    expect(nomeDeArquivo("...")).toBe("sem-titulo");
  });
  test("corta nomes longos", () => {
    expect(nomeDeArquivo("a".repeat(200)).length).toBe(60);
  });
});

describe("tituloVisivel", () => {
  test("usa o título; sem título, a primeira linha; sem nada, Sem título", () => {
    expect(tituloVisivel("  Meu título ", "x")).toBe("Meu título");
    expect(tituloVisivel("", "## Ideia solta\n\nresto")).toBe("Ideia solta");
    expect(tituloVisivel("", "")).toBe("Sem título");
  });
});
