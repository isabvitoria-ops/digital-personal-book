import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProvedorDeDados } from "./app/Dados";
import { ProvedorDeDialogos } from "./app/Dialogos";
import { ProvedorDeSincronia } from "./app/Sincronia";
import { Moldura } from "./app/Moldura";
import { Inicio } from "./telas/Inicio";
import { Buscar } from "./telas/Buscar";
import { Cadernos } from "./telas/Cadernos";
import { Caderno } from "./telas/Caderno";
import { Pagina } from "./telas/Pagina";
import { Arquivados, Artigos, Biblioteca, Cursos, Favoritas, Inbox, LinhaDoTempo, Lixeira, Revisar } from "./telas/Listas";
import { Mais } from "./telas/Mais";
import { Backup } from "./telas/Backup";
import { Imprimir } from "./telas/Imprimir";

/**
 * Endereços com # (HashRouter): o site mora no GitHub Pages, que não sabe
 * responder a "/pagina/abc" — mas "/#/pagina/abc" sempre abre.
 */
export function App() {
  return (
    <HashRouter>
      <ProvedorDeDados>
        <ProvedorDeSincronia>
        <ProvedorDeDialogos>
          <VoltarAoTopo />
          <Routes>
            <Route path="/imprimir/:tipo/:id" element={<Imprimir />} />
            <Route
              path="*"
              element={
                <Moldura>
                  <Routes>
                    <Route path="/" element={<Inicio />} />
                    <Route path="/buscar" element={<Buscar />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/cadernos" element={<Cadernos />} />
                    <Route path="/caderno/:id" element={<Caderno />} />
                    <Route path="/pagina/:id" element={<Pagina />} />
                    <Route path="/favoritas" element={<Favoritas />} />
                    <Route path="/revisar" element={<Revisar />} />
                    <Route path="/cursos" element={<Cursos />} />
                    <Route path="/biblioteca" element={<Biblioteca />} />
                    <Route path="/artigos" element={<Artigos />} />
                    <Route path="/linha-do-tempo" element={<LinhaDoTempo />} />
                    <Route path="/arquivados" element={<Arquivados />} />
                    <Route path="/lixeira" element={<Lixeira />} />
                    <Route path="/mais" element={<Mais />} />
                    <Route path="/backup" element={<Backup />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Moldura>
              }
            />
          </Routes>
        </ProvedorDeDialogos>
        </ProvedorDeSincronia>
      </ProvedorDeDados>
    </HashRouter>
  );
}

function VoltarAoTopo() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}
