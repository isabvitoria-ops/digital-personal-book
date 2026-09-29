import type { Anexo, Apagado, Area, Caderno, Id, Pagina } from "../dados/tipos";
import { nomeDeArquivo } from "../util/texto";

/**
 * COMO O CADERNO FICA GUARDADO NO REPOSITÓRIO PRIVADO
 *
 *   LEIA-ME.md          o que é esta pasta
 *   INDICE.md           as páginas organizadas por área e caderno, com links
 *   estrutura.json      áreas e cadernos
 *   sincronia.json      o manifesto: quem é quem e quando mudou
 *   paginas/<id>.md     uma página por arquivo: informações no topo + texto
 *   anexos/<id>/<nome>  PDFs e imagens
 *
 * A página fica em `paginas/<id>.md` (o nome não muda quando o título muda):
 * é o que deixa a sincronização simples e à prova de renomear. Para navegar
 * pelo GitHub, o INDICE.md organiza tudo por assunto.
 */

export const FORMATO = "caderno-pessoal-sync";
export const VERSAO = 1;

export interface Manifesto {
  formato: typeof FORMATO;
  versao: number;
  paginas: Record<Id, { atualizadaEm: string; excluidaEm: string | null }>;
  anexos: Record<Id, { paginaId: Id; nome: string; tipo: string; tamanho: number; criadoEm: string }>;
  apagados: Record<Id, { tipo: Apagado["tipo"]; em: string }>;
}

export interface Estrutura {
  areas: Area[];
  cadernos: Caderno[];
}

export const manifestoVazio = (): Manifesto => ({ formato: FORMATO, versao: VERSAO, paginas: {}, anexos: {}, apagados: {} });

export const caminhoPagina = (id: Id) => `paginas/${id}.md`;
export const caminhoAnexo = (a: Pick<Anexo, "id" | "nome">) => {
  const ponto = a.nome.lastIndexOf(".");
  const ext = ponto > 0 && a.nome.length - ponto <= 6 ? a.nome.slice(ponto).toLowerCase() : "";
  const base = ext ? a.nome.slice(0, ponto) : a.nome;
  return `anexos/${a.id}/${nomeDeArquivo(base, 60)}${ext}`;
};

// Campos gravados no topo do arquivo, nesta ordem. `abertaEm` fica de fora:
// é de cada aparelho ("continue de onde parou").
const CAMPOS: (keyof Pagina)[] = [
  "id", "titulo", "cadernoId", "secaoId", "tipo", "statusArtigo", "fonte",
  "marcadores", "favorita", "revisarEm", "criadaEm", "atualizadaEm", "excluidaEm",
];

export function paginaParaArquivo(p: Pagina): string {
  const topo = CAMPOS.map((c) => `${c}: ${JSON.stringify(p[c] ?? null)}`);
  return `---\n${topo.join("\n")}\n---\n${p.conteudo}`;
}

export function arquivoParaPagina(texto: string): Omit<Pagina, "abertaEm"> {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error("página sem cabeçalho");
  const campos: Record<string, unknown> = {};
  for (const linha of m[1]!.split("\n")) {
    const i = linha.indexOf(": ");
    if (i < 0) continue;
    campos[linha.slice(0, i)] = JSON.parse(linha.slice(i + 2));
  }
  if (typeof campos.id !== "string" || typeof campos.atualizadaEm !== "string") throw new Error("página sem id");
  return {
    id: campos.id,
    titulo: String(campos.titulo ?? ""),
    cadernoId: (campos.cadernoId as string | null) ?? null,
    secaoId: (campos.secaoId as string | null) ?? null,
    tipo: campos.tipo === "artigo" ? "artigo" : "nota",
    statusArtigo: (campos.statusArtigo as Pagina["statusArtigo"]) ?? null,
    fonte: String(campos.fonte ?? ""),
    marcadores: Array.isArray(campos.marcadores) ? (campos.marcadores as Pagina["marcadores"]) : [],
    favorita: campos.favorita === true,
    revisarEm: (campos.revisarEm as string | null) ?? null,
    criadaEm: String(campos.criadaEm ?? campos.atualizadaEm),
    atualizadaEm: campos.atualizadaEm,
    excluidaEm: (campos.excluidaEm as string | null) ?? null,
    conteudo: texto.slice(m[0].length),
  };
}

/** O índice legível, para navegar pelo GitHub. */
export function montarIndice(e: Estrutura, paginas: Pick<Pagina, "id" | "titulo" | "cadernoId" | "secaoId" | "excluidaEm">[]): string {
  const vivas = paginas.filter((p) => !p.excluidaEm);
  const titulo = (p: (typeof vivas)[number]) => (p.titulo.trim() || "Sem título").replace(/[[\]]/g, "");
  const link = (p: (typeof vivas)[number]) => `- [${titulo(p)}](${caminhoPagina(p.id)})`;
  const porTitulo = (a: (typeof vivas)[number], b: (typeof vivas)[number]) => titulo(a).localeCompare(titulo(b), "pt-BR");
  const linhas = ["# Meu Caderno — índice", "", "_Gerado pelo app a cada sincronização._", ""];
  const cadernosIds = new Set(e.cadernos.map((c) => c.id));
  const inbox = vivas.filter((p) => !p.cadernoId || !cadernosIds.has(p.cadernoId)).sort(porTitulo);
  if (inbox.length) linhas.push("## Inbox", "", ...inbox.map(link), "");
  for (const area of [...e.areas].sort((a, b) => a.ordem - b.ordem)) {
    const dela = e.cadernos.filter((c) => c.areaId === area.id);
    if (!dela.length) continue;
    linhas.push(`## ${area.nome}${area.arquivada ? " (arquivada)" : ""}`, "");
    for (const c of dela) {
      linhas.push(`### ${c.nome}${c.arquivado ? " (arquivado)" : ""}`, "");
      const doCaderno = vivas.filter((p) => p.cadernoId === c.id);
      const idsSecao = new Set(c.secoes.map((s) => s.id));
      linhas.push(...doCaderno.filter((p) => !p.secaoId || !idsSecao.has(p.secaoId)).sort(porTitulo).map(link));
      for (const s of c.secoes) {
        const daSecao = doCaderno.filter((p) => p.secaoId === s.id).sort(porTitulo);
        if (daSecao.length) linhas.push("", `**${s.nome}**`, "", ...daSecao.map(link));
      }
      linhas.push("");
    }
  }
  return linhas.join("\n");
}

export const LEIA_ME_REPO = `# Meu Caderno — dados

Este repositório guarda as anotações do app **Meu Caderno**. Ele precisa
continuar **privado**.

- \`INDICE.md\`: todas as páginas, por área e caderno.
- \`paginas/\`: uma página por arquivo, em texto comum (Markdown).
- \`anexos/\`: os PDFs e imagens.
- \`estrutura.json\` e \`sincronia.json\`: usados pelo app para sincronizar.

Cada sincronização é um commit: o histórico do GitHub guarda as versões
antigas de tudo.
`;
