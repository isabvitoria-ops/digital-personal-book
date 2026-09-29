import { db } from "./banco";
import { agora, novoId } from "./ids";
import type { Anexo, Apagado, Area, Caderno, Ficha, Id, Pagina, TipoCaderno } from "./tipos";

/** Anota o que foi apagado para sempre, para a sincronização levar adiante. */
async function lembrarApagado(id: Id, tipo: Apagado["tipo"]) {
  await db.apagados.put({ id, tipo, em: agora() });
}
import { anexosCitados } from "../util/links";

// ---------------------------------------------------------------------------
// Áreas
// ---------------------------------------------------------------------------

export async function criarArea(nome: string): Promise<Area> {
  const ordem = (await db.areas.count()) + 1;
  const t = agora();
  const area: Area = { id: novoId(), nome: nome.trim(), ordem, arquivada: false, criadaEm: t, atualizadaEm: t };
  await db.areas.add(area);
  return area;
}

export async function atualizarArea(id: Id, mudancas: Partial<Pick<Area, "nome" | "arquivada" | "ordem">>) {
  await db.areas.update(id, { ...mudancas, atualizadaEm: agora() });
}

/** Área só se apaga vazia. Com cadernos dentro, o caminho é arquivar. */
export async function apagarArea(id: Id): Promise<boolean> {
  if ((await db.cadernos.where("areaId").equals(id).count()) > 0) return false;
  await db.areas.delete(id);
  await lembrarApagado(id, "area");
  return true;
}

export const AREAS_SUGERIDAS = [
  "Nutrição & Saúde",
  "Negócio & Marketing",
  "Finanças",
  "Tecnologia & IA",
  "Idiomas",
  "Pessoal",
];

export async function criarAreasSugeridas() {
  if ((await db.areas.count()) > 0) return;
  for (const nome of AREAS_SUGERIDAS) await criarArea(nome);
}

// ---------------------------------------------------------------------------
// Cadernos
// ---------------------------------------------------------------------------

export async function criarCaderno(areaId: Id, nome: string, tipo: TipoCaderno, ficha?: Ficha): Promise<Caderno> {
  const ordem = (await db.cadernos.where("areaId").equals(areaId).count()) + 1;
  const t = agora();
  const caderno: Caderno = {
    id: novoId(),
    areaId,
    nome: nome.trim(),
    tipo,
    ficha: tipo === "comum" ? {} : { status: "andamento", ...ficha },
    secoes: [],
    // Curso e livro se leem na ordem em que foram escritos (aula 1, aula 2…).
    ordenacao: tipo === "curso" || tipo === "livro" ? "criacao" : "recentes",
    ordem,
    arquivado: false,
    criadoEm: t,
    atualizadoEm: t,
  };
  await db.cadernos.add(caderno);
  return caderno;
}

export async function atualizarCaderno(id: Id, mudancas: Partial<Omit<Caderno, "id" | "criadoEm">>) {
  await db.cadernos.update(id, { ...mudancas, atualizadoEm: agora() });
}

export async function criarSecao(caderno: Caderno, nome: string) {
  await atualizarCaderno(caderno.id, { secoes: [...caderno.secoes, { id: novoId(), nome: nome.trim() }] });
}

export async function renomearSecao(caderno: Caderno, secaoId: Id, nome: string) {
  await atualizarCaderno(caderno.id, {
    secoes: caderno.secoes.map((s) => (s.id === secaoId ? { ...s, nome: nome.trim() } : s)),
  });
}

export async function moverSecao(caderno: Caderno, secaoId: Id, direcao: -1 | 1) {
  const i = caderno.secoes.findIndex((s) => s.id === secaoId);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= caderno.secoes.length) return;
  const secoes = [...caderno.secoes];
  [secoes[i], secoes[j]] = [secoes[j]!, secoes[i]!];
  await atualizarCaderno(caderno.id, { secoes });
}

/** Tirar a seção não apaga página nenhuma: elas voltam para "sem seção". */
export async function removerSecao(caderno: Caderno, secaoId: Id) {
  await db.transaction("rw", db.cadernos, db.paginas, async () => {
    const t = agora();
    await db.paginas
      .where("cadernoId")
      .equals(caderno.id)
      .filter((p) => p.secaoId === secaoId)
      .modify({ secaoId: null, atualizadaEm: t });
    await atualizarCaderno(caderno.id, { secoes: caderno.secoes.filter((s) => s.id !== secaoId) });
  });
}

/** Caderno só se apaga vazio (nem na lixeira). Com páginas, arquiva. */
export async function apagarCaderno(id: Id): Promise<boolean> {
  if ((await db.paginas.where("cadernoId").equals(id).count()) > 0) return false;
  await db.cadernos.delete(id);
  await lembrarApagado(id, "caderno");
  return true;
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

export async function criarPagina(
  destino: { cadernoId: Id | null; secaoId?: Id | null } = { cadernoId: null },
  inicio: { id?: Id; titulo?: string } = {},
): Promise<Pagina> {
  const t = agora();
  const pagina: Pagina = {
    id: inicio.id ?? novoId(),
    cadernoId: destino.cadernoId,
    secaoId: destino.secaoId ?? null,
    titulo: inicio.titulo ?? "",
    conteudo: "",
    tipo: "nota",
    statusArtigo: null,
    fonte: "",
    marcadores: [],
    favorita: false,
    revisarEm: null,
    criadaEm: t,
    atualizadaEm: t,
    // Só conta como aberta quando ela abre (a página criada pelo [[ não).
    abertaEm: null,
    excluidaEm: null,
  };
  await db.paginas.add(pagina);
  return pagina;
}

type MudancaDePagina = Partial<Omit<Pagina, "id" | "criadaEm" | "atualizadaEm" | "abertaEm">>;

export async function atualizarPagina(id: Id, mudancas: MudancaDePagina) {
  await db.paginas.update(id, { ...mudancas, atualizadaEm: agora() });
}

/** Abrir não é editar: marca "aberta em" sem mexer na data de atualização. */
export async function marcarAberta(id: Id) {
  await db.paginas.update(id, { abertaEm: agora() });
}

export async function moverPagina(id: Id, cadernoId: Id | null, secaoId: Id | null = null) {
  await atualizarPagina(id, { cadernoId, secaoId: cadernoId ? secaoId : null });
}

export async function mandarParaLixeira(id: Id) {
  await atualizarPagina(id, { excluidaEm: agora() });
}

export async function restaurarDaLixeira(id: Id) {
  await atualizarPagina(id, { excluidaEm: null });
}

/** Apagar de verdade: a página e os anexos dela. Não tem volta. */
export async function apagarParaSempre(id: Id) {
  await db.transaction("rw", db.paginas, db.anexos, db.apagados, async () => {
    const anexos = await db.anexos.where("paginaId").equals(id).primaryKeys();
    await db.anexos.bulkDelete(anexos);
    await db.paginas.delete(id);
    for (const a of anexos) await lembrarApagado(a, "anexo");
    await lembrarApagado(id, "pagina");
  });
}

/**
 * Página aberta e abandonada sem nada escrito some sozinha. Sem isto, cada
 * toque sem querer no "+" deixaria um "Sem título" para sempre na Inbox.
 */
export async function descartarSeVazia(id: Id): Promise<boolean> {
  const p = await db.paginas.get(id);
  if (!p) return false;
  const vazia = !p.titulo.trim() && !p.conteudo.replace(/&nbsp;|\s/g, "") && !p.fonte.trim();
  if (!vazia) return false;
  if ((await db.anexos.where("paginaId").equals(id).count()) > 0) return false;
  await db.paginas.delete(id);
  await lembrarApagado(id, "pagina");
  return true;
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

export async function guardarAnexo(paginaId: Id, arquivo: Blob, nome: string): Promise<Anexo> {
  const anexo: Anexo = {
    id: novoId(),
    paginaId,
    nome,
    tipo: arquivo.type || "application/octet-stream",
    tamanho: arquivo.size,
    dados: arquivo,
    criadoEm: agora(),
  };
  await db.anexos.add(anexo);
  await atualizarPagina(paginaId, {});
  return anexo;
}

export async function apagarAnexo(id: Id) {
  const anexo = await db.anexos.get(id);
  await db.anexos.delete(id);
  await lembrarApagado(id, "anexo");
  if (anexo) await atualizarPagina(anexo.paginaId, {});
}

/** Anexos que ninguém mais cita no texto — para oferecer a limpeza. */
export function anexosSoltos(pagina: Pagina, anexos: Anexo[]): Anexo[] {
  const citados = new Set(anexosCitados(pagina.conteudo));
  return anexos.filter((a) => !citados.has(a.id));
}
