import { useEffect, type ReactNode } from "react";

/** Menu suspenso que fecha ao escolher, ao tocar fora ou com Esc. */
export function Menu({ fechar, children }: { fechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [fechar]);
  return (
    <>
      <div className="menu-fundo" onClick={fechar} aria-hidden="true" />
      <div className="menu" role="menu" onClick={fechar}>
        {children}
      </div>
    </>
  );
}
