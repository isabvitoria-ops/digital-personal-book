import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../dados/banco";
import { RemotoGitHub } from "../sincronia/github";
import { registrarResultado, sincronizar, type Resumo } from "../sincronia/sincronizar";

/**
 * Sincronização automática, quando ela configurou o repositório privado:
 * ao abrir o app, a cada 3 minutos com o app aberto, ao voltar para ele e
 * ao reconectar à internet. Sem configuração, não faz nada.
 */
interface Api {
  configurada: boolean;
  repo: string | null;
  sincronizando: boolean;
  ultimaEm: string | null;
  erro: string | null;
  sincronizarAgora: () => Promise<Resumo | null>;
}

const Contexto = createContext<Api | null>(null);
const INTERVALO = 3 * 60_000;

export function ProvedorDeSincronia({ children }: { children: ReactNode }) {
  const config = useLiveQuery(() => db.sincronia.get("github"));
  const [sincronizando, definirSincronizando] = useState(false);
  const rodando = useRef(false);

  const sincronizarAgora = useCallback(async () => {
    const c = await db.sincronia.get("github");
    if (!c || rodando.current || !navigator.onLine) return null;
    rodando.current = true;
    definirSincronizando(true);
    try {
      const r = await sincronizar(new RemotoGitHub(c.repo, c.token));
      await registrarResultado(null);
      return r;
    } catch (e) {
      await registrarResultado(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      rodando.current = false;
      definirSincronizando(false);
    }
  }, []);

  const configurada = Boolean(config);
  useEffect(() => {
    if (!configurada) return;
    void sincronizarAgora();
    const relogio = window.setInterval(() => {
      if (document.visibilityState === "visible") void sincronizarAgora();
    }, INTERVALO);
    const aoVoltar = () => document.visibilityState === "visible" && void sincronizarAgora();
    const aoConectar = () => void sincronizarAgora();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoConectar);
    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoConectar);
    };
  }, [configurada, sincronizarAgora]);

  return (
    <Contexto.Provider
      value={{
        configurada,
        repo: config?.repo ?? null,
        sincronizando,
        ultimaEm: config?.ultimaEm ?? null,
        erro: config?.ultimoErro ?? null,
        sincronizarAgora,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSincronia(): Api {
  const api = useContext(Contexto);
  if (!api) throw new Error("useSincronia fora do ProvedorDeSincronia");
  return api;
}
