import type { Apagado, Area, Caderno, Id, Pagina } from "../dados/tipos";
import type { AnexoSemDados } from "../dados/backup";
import type { Estrutura, Manifesto } from "./formato";

/**
 * O PLANO DE UMA SINCRONIZAÇÃO — sem internet e sem banco, só a conta.
 *
 * Regra única, a mesma do backup: vence a versão editada por último. O que foi
 * apagado para sempre em qualquer aparelho some dos dois. Anexo não muda
 * depois de criado: ou existe, ou não.
 */

export interface Local {
  areas: Area[];
  cadernos: Caderno[];
  paginas: Pick<Pagina, "id" | "atualizadaEm" | "excluidaEm">[];
  anexos: AnexoSemDados[];
  apagados: Apagado[];
}

export interface Plano {
  /** Páginas que o remoto tem mais novas: baixar e gravar aqui. */
  baixarPaginas: Id[];
  /** Páginas mais novas aqui: subir. */
  subirPaginas: Id[];
  baixarAnexos: Id[];
  subirAnexos: Id[];
  /** Registros para apagar aqui (apagados no outro aparelho). */
  apagarAqui: { id: Id; tipo: Apagado["tipo"] }[];
  /** Caminhos de arquivo para apagar no remoto. */
  apagarLa: { id: Id; tipo: Apagado["tipo"] }[];
  /** Áreas e cadernos que vieram mais novos do remoto. */
  gravarAqui: { areas: Area[]; cadernos: Caderno[] };
  /** A estrutura unida, para gravar no remoto. */
  estrutura: Estrutura;
  /** O manifesto novo, como ficará no remoto depois de subir. */
  manifesto: Manifesto;
  apagadosUnidos: Apagado[];
}

function juntarPorData<T extends { id: Id }>(aqui: T[], la: T[], data: (x: T) => string, apagados: Set<Id>) {
  const mapa = new Map<Id, T>();
  const gravarAqui: T[] = [];
  const locais = new Map(aqui.map((x) => [x.id, x]));
  for (const x of aqui) if (!apagados.has(x.id)) mapa.set(x.id, x);
  for (const y of la) {
    if (apagados.has(y.id)) continue;
    const x = locais.get(y.id);
    if (!x || data(y) > data(x)) {
      mapa.set(y.id, y);
      gravarAqui.push(y);
    }
  }
  return { unidos: [...mapa.values()], gravarAqui };
}

export function planejar(local: Local, remoto: Manifesto, estruturaRemota: Estrutura): Plano {
  // Apagados: a união dos dois lados, o mais recente de cada.
  const apagados = new Map<Id, Apagado>();
  for (const a of local.apagados) apagados.set(a.id, a);
  for (const [id, a] of Object.entries(remoto.apagados)) {
    const atual = apagados.get(id);
    if (!atual || a.em > atual.em) apagados.set(id, { id, tipo: a.tipo, em: a.em });
  }
  const idsApagados = new Set(apagados.keys());

  // Áreas e cadernos.
  const areas = juntarPorData(local.areas, estruturaRemota.areas, (a) => a.atualizadaEm, idsApagados);
  const cadernos = juntarPorData(local.cadernos, estruturaRemota.cadernos, (c) => c.atualizadoEm, idsApagados);

  // Páginas.
  const baixarPaginas: Id[] = [];
  const subirPaginas: Id[] = [];
  const paginasFinais: Manifesto["paginas"] = {};
  const locais = new Map(local.paginas.map((p) => [p.id, p]));
  const ids = new Set([...locais.keys(), ...Object.keys(remoto.paginas)]);
  for (const id of ids) {
    if (idsApagados.has(id)) continue;
    const aqui = locais.get(id);
    const la = remoto.paginas[id];
    if (aqui && (!la || aqui.atualizadaEm > la.atualizadaEm)) {
      subirPaginas.push(id);
      paginasFinais[id] = { atualizadaEm: aqui.atualizadaEm, excluidaEm: aqui.excluidaEm };
    } else if (la && (!aqui || la.atualizadaEm > aqui.atualizadaEm)) {
      baixarPaginas.push(id);
      paginasFinais[id] = la;
    } else if (aqui) {
      paginasFinais[id] = { atualizadaEm: aqui.atualizadaEm, excluidaEm: aqui.excluidaEm };
    }
  }

  // Anexos.
  const anexosAqui = new Map(local.anexos.map((a) => [a.id, a]));
  const baixarAnexos = Object.keys(remoto.anexos).filter((id) => !anexosAqui.has(id) && !idsApagados.has(id));
  const subirAnexos = [...anexosAqui.keys()].filter((id) => !remoto.anexos[id] && !idsApagados.has(id));
  const anexosFinais: Manifesto["anexos"] = {};
  for (const [id, a] of Object.entries(remoto.anexos)) if (!idsApagados.has(id)) anexosFinais[id] = a;
  for (const a of local.anexos) {
    if (idsApagados.has(a.id)) continue;
    anexosFinais[a.id] = { paginaId: a.paginaId, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, criadoEm: a.criadoEm };
  }

  // O que apagar em cada lado.
  const existeAqui = (id: Id, tipo: Apagado["tipo"]) =>
    tipo === "pagina" ? locais.has(id) : tipo === "anexo" ? anexosAqui.has(id) : tipo === "area" ? local.areas.some((a) => a.id === id) : local.cadernos.some((c) => c.id === id);
  const apagarAqui = [...apagados.values()].filter((a) => existeAqui(a.id, a.tipo)).map(({ id, tipo }) => ({ id, tipo }));
  const apagarLa = [...apagados.values()]
    .filter((a) => (a.tipo === "pagina" && remoto.paginas[a.id]) || (a.tipo === "anexo" && remoto.anexos[a.id]))
    .map(({ id, tipo }) => ({ id, tipo }));

  const manifesto: Manifesto = {
    formato: remoto.formato,
    versao: remoto.versao,
    paginas: paginasFinais,
    anexos: anexosFinais,
    apagados: Object.fromEntries([...apagados.values()].map((a) => [a.id, { tipo: a.tipo, em: a.em }])),
  };

  return {
    baixarPaginas,
    subirPaginas,
    baixarAnexos,
    subirAnexos,
    apagarAqui,
    apagarLa,
    gravarAqui: { areas: areas.gravarAqui, cadernos: cadernos.gravarAqui },
    estrutura: {
      areas: areas.unidos.sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id)),
      cadernos: cadernos.unidos.sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id)),
    },
    manifesto,
    apagadosUnidos: [...apagados.values()],
  };
}
