import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, lerConfig } from "../dados/banco";
import type { Area, Caderno, Config, Id, Pagina } from "../dados/tipos";

/**
 * Tudo o que as telas leem, num lugar só e sempre atualizado: quando uma
 * página é salva, todas as listas (Início, barra lateral, busca) já veem.
 *
 * Os anexos ficam de fora de propósito — são os arquivos pesados, e só a
 * página que os usa precisa deles.
 */
export interface Dados {
  areas: Area[];
  cadernos: Caderno[];
  /** Todas, inclusive as da lixeira. Use `vivas` para o dia a dia. */
  paginas: Pagina[];
  vivas: Pagina[];
  config: Config;
  areaPorId: Map<Id, Area>;
  cadernoPorId: Map<Id, Caderno>;
  paginaPorId: Map<Id, Pagina>;
}

const Contexto = createContext<Dados | null>(null);

export function ProvedorDeDados({ children }: { children: ReactNode }) {
  const bruto = useLiveQuery(async () => {
    const [areas, cadernos, paginas, config] = await Promise.all([
      db.areas.orderBy("ordem").toArray(),
      db.cadernos.toArray(),
      db.paginas.toArray(),
      lerConfig(),
    ]);
    return { areas, cadernos, paginas, config };
  });

  const dados = useMemo<Dados | null>(() => {
    if (!bruto) return null;
    const cadernos = [...bruto.cadernos].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
    return {
      ...bruto,
      cadernos,
      vivas: bruto.paginas.filter((p) => !p.excluidaEm),
      areaPorId: new Map(bruto.areas.map((a) => [a.id, a])),
      cadernoPorId: new Map(cadernos.map((c) => [c.id, c])),
      paginaPorId: new Map(bruto.paginas.map((p) => [p.id, p])),
    };
  }, [bruto]);

  if (!dados) return <div className="carregando" aria-busy="true" />;
  return <Contexto.Provider value={dados}>{children}</Contexto.Provider>;
}

export function useDados(): Dados {
  const d = useContext(Contexto);
  if (!d) throw new Error("useDados fora do ProvedorDeDados");
  return d;
}

/** "Nutrição & Saúde › Curso de Microbiota › Módulo 2" — ou "Inbox". */
export function caminhoDaPagina(p: Pagina, d: Pick<Dados, "areaPorId" | "cadernoPorId">): string[] {
  const caderno = p.cadernoId ? d.cadernoPorId.get(p.cadernoId) : undefined;
  if (!caderno) return ["Inbox"];
  const area = d.areaPorId.get(caderno.areaId);
  const secao = caderno.secoes.find((s) => s.id === p.secaoId);
  return [area?.nome ?? "Sem área", caderno.nome, ...(secao ? [secao.nome] : [])];
}

/** Página sem caderno (ou com caderno que não existe mais) está na Inbox. */
export function estaNaInbox(p: Pagina, d: Pick<Dados, "cadernoPorId">): boolean {
  return !p.cadernoId || !d.cadernoPorId.has(p.cadernoId);
}
