import { Link } from "react-router-dom";
import { estaNaInbox, useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { salvarConfig } from "../dados/banco";
import { MARCADORES, type Marcador } from "../dados/tipos";
import { Icone, type NomeIcone } from "../componentes/Icone";

/** No celular, o que não cabe na barra de baixo mora aqui. */
export function Mais() {
  const dados = useDados();
  const { perguntar } = useDialogos();
  const naInbox = dados.vivas.filter((p) => estaNaInbox(p, dados)).length;
  const naLixeira = dados.paginas.filter((p) => p.excluidaEm).length;

  const linha = (para: string, icone: NomeIcone, rotulo: string, contador?: number) => (
    <li>
      <Link to={para} className="item">
        <span className="item-corpo item-com-icone">
          <Icone nome={icone} tamanho={20} />
          <span className="item-titulo">{rotulo}</span>
        </span>
        {!!contador && <span className="contador">{contador}</span>}
      </Link>
    </li>
  );

  async function renomearMarcador(m: Marcador) {
    const nome = await perguntar({
      titulo: "Renomear marcador",
      rotulo: "Nome",
      valor: dados.config.nomesMarcadores[m],
      confirmar: "Salvar",
    });
    if (nome) await salvarConfig({ nomesMarcadores: { ...dados.config.nomesMarcadores, [m]: nome } });
  }

  return (
    <div className="tela">
      <h1 className="titulo-tela">Mais</h1>
      <ul className="lista">
        {linha("/inbox", "inbox", "Inbox", naInbox)}
        {linha("/favoritas", "estrela", "Favoritas")}
        {linha("/revisar", "revisar", "Revisar")}
      </ul>
      <ul className="lista">
        {linha("/cursos", "curso", "Cursos")}
        {linha("/biblioteca", "livro", "Biblioteca")}
        {linha("/artigos", "artigo", "Artigos")}
        {linha("/linha-do-tempo", "tempo", "Linha do tempo")}
      </ul>
      <ul className="lista">
        {linha("/arquivados", "arquivo", "Arquivados")}
        {linha("/lixeira", "lixeira", "Lixeira", naLixeira)}
        {linha("/backup", "backup", "Backup")}
      </ul>

      <section className="secao">
        <h2 className="secao-titulo">Marcadores</h2>
        <p className="dica">
          São só quatro, de propósito: marcador demais vira bagunça em um ano. Dá para trocar o nome — as páginas
          marcadas continuam marcadas.
        </p>
        <div className="detalhes">
          {MARCADORES.map((m) => (
            <button key={m} type="button" className="botao-chip" onClick={() => void renomearMarcador(m)}>
              {dados.config.nomesMarcadores[m]} <Icone nome="editar" tamanho={14} />
            </button>
          ))}
        </div>
      </section>

      <p className="dica rodape-mais">
        Meu Caderno · tudo guardado neste aparelho · sem conta, sem nuvem, sem IA.
      </p>
    </div>
  );
}
