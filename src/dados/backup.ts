import type { Anexo, Area, Caderno, Config, Id, Pagina } from "./tipos";
import { nomeDeArquivo } from "../util/texto";
import { trocarEnderecos } from "../util/links";

/**
 * O BACKUP É UM .ZIP QUE SE LÊ SEM ESTE APP.
 *
 * Dentro dele:
 *   LEIA-ME.txt
 *   caderno.json                     tudo, do jeito exato que o app guarda
 *   Inbox/…md, <Área>/<Caderno>/[<Seção>/]…md   uma página por arquivo
 *   anexos/<id>-<nome>               os PDFs e imagens
 *
 * O caderno.json é o que o app usa para restaurar. Os .md são para ELA: abrem
 * no Bloco de Notas, no Obsidian, no VS Code, em qualquer lugar, daqui a dez
 * anos. Por isso os links dentro dos .md viram caminhos de arquivo de verdade
 * ("../anexos/abc-exame.pdf"), e não o "anexo:abc" que só este app entende.
 */

export type AnexoSemDados = Omit<Anexo, "dados">;

export interface Pacote {
  areas: Area[];
  cadernos: Caderno[];
  paginas: Pagina[];
  anexos: AnexoSemDados[];
  config?: Pick<Config, "nomesMarcadores">;
}

export interface ArquivoJson extends Pacote {
  formato: "caderno-pessoal";
  versao: 1;
  exportadoEm: string;
}

export function caminhoDoAnexo(a: Pick<Anexo, "id" | "nome">): string {
  const ponto = a.nome.lastIndexOf(".");
  const ext = ponto > 0 && a.nome.length - ponto <= 6 ? a.nome.slice(ponto) : "";
  const base = ext ? a.nome.slice(0, ponto) : a.nome;
  return `anexos/${a.id}-${nomeDeArquivo(base, 50)}${ext.toLowerCase()}`;
}

/** Onde cada página vai morar dentro do .zip. */
export function caminhosDasPaginas(p: Pacote): Map<Id, string> {
  const areas = new Map(p.areas.map((a) => [a.id, a]));
  const cadernos = new Map(p.cadernos.map((c) => [c.id, c]));
  const caminhos = new Map<Id, string>();

  for (const pagina of p.paginas) {
    const arquivo = `${nomeDeArquivo(pagina.titulo || "Sem título")} - ${pagina.id}.md`;
    const caderno = pagina.cadernoId ? cadernos.get(pagina.cadernoId) : undefined;
    let pasta: string[];
    if (!caderno) {
      pasta = ["Inbox"];
    } else {
      const area = areas.get(caderno.areaId);
      pasta = [nomeDeArquivo(area?.nome ?? "Sem área"), nomeDeArquivo(caderno.nome)];
      const secao = caderno.secoes.find((s) => s.id === pagina.secaoId);
      if (secao) pasta.push(nomeDeArquivo(secao.nome));
    }
    if (pagina.excluidaEm) pasta = ["Lixeira", ...pasta];
    caminhos.set(pagina.id, [...pasta, arquivo].join("/"));
  }
  return caminhos;
}

/** Caminho de `ate` visto de dentro da pasta de `de`, pronto para link Markdown. */
export function caminhoRelativo(de: string, ate: string): string {
  const pastaDe = de.split("/").slice(0, -1);
  const partesAte = ate.split("/");
  let comum = 0;
  while (comum < pastaDe.length && comum < partesAte.length - 1 && pastaDe[comum] === partesAte[comum]) comum++;
  const subir = pastaDe.slice(comum).map(() => "..");
  return [...subir, ...partesAte.slice(comum)]
    .map((s) => (s === ".." ? s : encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29")))
    .join("/");
}

function yaml(valor: unknown): string {
  if (valor === null || valor === undefined) return "null";
  if (typeof valor === "boolean" || typeof valor === "number") return String(valor);
  if (Array.isArray(valor)) return `[${valor.map(yaml).join(", ")}]`;
  return JSON.stringify(String(valor));
}

/** A página como arquivo .md, com as informações dela no topo (front matter). */
export function paginaEmMarkdown(
  pagina: Pagina,
  caminhos: Map<Id, string>,
  anexos: Map<Id, AnexoSemDados>,
): string {
  const aqui = caminhos.get(pagina.id)!;
  const corpo = trocarEnderecos(pagina.conteudo, (tipo, id) => {
    if (tipo === "pagina") {
      const alvo = caminhos.get(id);
      return alvo ? caminhoRelativo(aqui, alvo) : null;
    }
    const anexo = anexos.get(id);
    return anexo ? caminhoRelativo(aqui, caminhoDoAnexo(anexo)) : null;
  });

  const topo = [
    "---",
    `id: ${yaml(pagina.id)}`,
    `titulo: ${yaml(pagina.titulo)}`,
    `tipo: ${yaml(pagina.tipo)}`,
    ...(pagina.tipo === "artigo" ? [`status: ${yaml(pagina.statusArtigo)}`, `fonte: ${yaml(pagina.fonte)}`] : []),
    `marcadores: ${yaml(pagina.marcadores)}`,
    `favorita: ${yaml(pagina.favorita)}`,
    `revisar_em: ${yaml(pagina.revisarEm)}`,
    `criada_em: ${yaml(pagina.criadaEm)}`,
    `atualizada_em: ${yaml(pagina.atualizadaEm)}`,
    "---",
    "",
  ];
  const titulo = pagina.titulo.trim() ? [`# ${pagina.titulo.trim()}`, ""] : [];
  return [...topo, ...titulo, corpo.trim(), ""].join("\n");
}

export const LEIA_ME = `MEU CADERNO — BACKUP
====================

Este arquivo guarda todo o seu caderno.

PARA LER SEM O APP
  Cada página é um arquivo .md (texto comum). Abre em qualquer editor de
  texto — Bloco de Notas, TextEdit, VS Code, Obsidian. As pastas seguem a sua
  organização: Área / Caderno / Seção. O que estava na Inbox está em "Inbox".
  Os PDFs e imagens estão na pasta "anexos", e os links dentro das páginas
  apontam para eles.

PARA VOLTAR AO APP
  No app: Mais → Backup → "Restaurar de um backup" → escolha este .zip.
  Ele JUNTA com o que já existe no aparelho: nada é apagado, e quando a mesma
  página existe nos dois lugares, fica a versão editada por último.

O arquivo caderno.json tem tudo, do jeito exato que o app guarda. Não precisa
abri-lo — ele existe para a restauração ser fiel.
`;

export interface ArquivoDeTexto {
  caminho: string;
  conteudo: string;
}

/** Todos os arquivos de texto do backup (os anexos binários vão à parte). */
export function montarArquivosDeTexto(p: Pacote, exportadoEm: string): ArquivoDeTexto[] {
  const caminhos = caminhosDasPaginas(p);
  const anexos = new Map(p.anexos.map((a) => [a.id, a]));
  const json: ArquivoJson = { formato: "caderno-pessoal", versao: 1, exportadoEm, ...p };
  return [
    { caminho: "LEIA-ME.txt", conteudo: LEIA_ME },
    { caminho: "caderno.json", conteudo: JSON.stringify(json, null, 1) },
    ...p.paginas.map((pagina) => ({
      caminho: caminhos.get(pagina.id)!,
      conteudo: paginaEmMarkdown(pagina, caminhos, anexos),
    })),
  ];
}

// ---------------------------------------------------------------------------
// Restaurar = juntar
// ---------------------------------------------------------------------------

export function lerArquivoJson(texto: string): ArquivoJson {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error("O arquivo caderno.json está danificado.");
  }
  const d = dados as Partial<ArquivoJson>;
  if (d.formato !== "caderno-pessoal") throw new Error("Este .zip não é um backup do Meu Caderno.");
  if (d.versao !== 1) throw new Error("Este backup é de uma versão mais nova do app. Atualize a página e tente de novo.");
  if (!Array.isArray(d.areas) || !Array.isArray(d.cadernos) || !Array.isArray(d.paginas) || !Array.isArray(d.anexos)) {
    throw new Error("O backup está incompleto.");
  }
  return d as ArquivoJson;
}

export interface PlanoDeJuncao {
  areas: Area[];
  cadernos: Caderno[];
  paginas: Pagina[];
  /** Anexos que o aparelho ainda não tem — precisam ser lidos do .zip. */
  anexos: AnexoSemDados[];
  resumo: { novas: number; atualizadas: number; iguais: number };
}

function maisNovo(vindo: string, local: string | undefined) {
  return local === undefined || vindo > local;
}

/**
 * Juntar sem perder: o que só existe no backup entra; o que existe nos dois
 * fica com a versão editada por último; o que só existe no aparelho fica
 * como está. Restaurar nunca apaga.
 */
export function planejarJuncao(local: Pacote, vindo: Pacote): PlanoDeJuncao {
  const areasLocais = new Map(local.areas.map((a) => [a.id, a.atualizadaEm]));
  const cadernosLocais = new Map(local.cadernos.map((c) => [c.id, c.atualizadoEm]));
  const paginasLocais = new Map(local.paginas.map((p) => [p.id, p.atualizadaEm]));
  const anexosLocais = new Set(local.anexos.map((a) => a.id));

  const areas = vindo.areas.filter((a) => maisNovo(a.atualizadaEm, areasLocais.get(a.id)));
  const idsDeArea = new Set([...local.areas, ...vindo.areas].map((a) => a.id));
  const cadernos = vindo.cadernos
    .filter((c) => idsDeArea.has(c.areaId))
    .filter((c) => maisNovo(c.atualizadoEm, cadernosLocais.get(c.id)));
  const idsDeCaderno = new Set([...local.cadernos, ...cadernos].map((c) => c.id));

  const resumo = { novas: 0, atualizadas: 0, iguais: 0 };
  const paginas: Pagina[] = [];
  for (const p of vindo.paginas) {
    const localEm = paginasLocais.get(p.id);
    if (!maisNovo(p.atualizadaEm, localEm)) {
      resumo.iguais++;
      continue;
    }
    if (localEm === undefined) resumo.novas++;
    else resumo.atualizadas++;
    // Página cujo caderno não veio (nem existe aqui) cai na Inbox em vez de sumir.
    const orfa = p.cadernoId !== null && !idsDeCaderno.has(p.cadernoId);
    paginas.push(orfa ? { ...p, cadernoId: null, secaoId: null } : p);
  }

  const anexos = vindo.anexos.filter((a) => !anexosLocais.has(a.id));
  return { areas, cadernos, paginas, anexos, resumo };
}
