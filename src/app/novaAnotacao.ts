import { useNavigate } from "react-router-dom";
import { criarPagina } from "../dados/operacoes";
import type { Id } from "../dados/tipos";

/** O "+": cria e abre. Sem perguntar onde — o lugar é decidido depois. */
export function useNovaAnotacao() {
  const navegar = useNavigate();
  return async (destino?: { cadernoId: Id; secaoId?: Id | null }) => {
    const p = await criarPagina(destino ?? { cadernoId: null });
    navegar(`/pagina/${p.id}`, { state: { nova: true } });
  };
}
