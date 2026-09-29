import Dexie, { type EntityTable } from "dexie";
import type { Anexo, Apagado, Area, Caderno, Config, Pagina, Sincronia } from "./tipos";
import { NOMES_MARCADORES_PADRAO } from "./tipos";

/**
 * O banco mora NO APARELHO (IndexedDB do navegador). Nada sai daqui sem ela
 * mandar. A única saída é a sincronização, e só para o repositório PRIVADO
 * que ela mesma configurar.
 */
export class BancoDoCaderno extends Dexie {
  areas!: EntityTable<Area, "id">;
  cadernos!: EntityTable<Caderno, "id">;
  paginas!: EntityTable<Pagina, "id">;
  anexos!: EntityTable<Anexo, "id">;
  config!: EntityTable<Config, "chave">;
  apagados!: EntityTable<Apagado, "id">;
  sincronia!: EntityTable<Sincronia, "chave">;

  constructor(nome = "caderno-pessoal") {
    super(nome);
    this.version(1).stores({
      areas: "id, ordem",
      cadernos: "id, areaId",
      paginas: "id, cadernoId, atualizadaEm, abertaEm",
      anexos: "id, paginaId",
      config: "chave",
    });
    // v2: sincronização entre aparelhos. "apagados" lembra o que foi apagado
    // para sempre, para o outro aparelho apagar também.
    this.version(2).stores({
      apagados: "id",
      sincronia: "chave",
    });
  }
}

export let db = new BancoDoCaderno();

/** Só para os testes: um banco limpo e isolado a cada caso. */
export function trocarBanco(novo: BancoDoCaderno) {
  db = novo;
}

export async function lerConfig(): Promise<Config> {
  const c = await db.config.get("geral");
  return (
    c ?? { chave: "geral", nomesMarcadores: { ...NOMES_MARCADORES_PADRAO }, ultimoBackupEm: null }
  );
}

export async function salvarConfig(parcial: Partial<Omit<Config, "chave">>) {
  const atual = await lerConfig();
  await db.config.put({ ...atual, ...parcial, chave: "geral" });
}

/**
 * Pede ao navegador para não apagar os dados sozinho quando faltar espaço.
 * O Chrome costuma aceitar para app instalado; o Safari decide por conta
 * própria. Não é garantia — por isso existe o backup.
 */
export async function pedirArmazenamentoPersistente(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
