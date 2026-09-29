import { Link } from "react-router-dom";
import { estaNaInbox, useDados } from "../app/Dados";
import { useNovaAnotacao } from "../app/novaAnotacao";
import { ListaDePaginas } from "../componentes/ListaDePaginas";
import { Icone } from "../componentes/Icone";
import { criarAreasSugeridas, AREAS_SUGERIDAS } from "../dados/operacoes";
import { diasDesde, haQuanto, hoje } from "../util/datas";

/**
 * O Início é pequeno de propósito: voltar para o que estava fazendo, anotar
 * algo novo, e o que pede atenção hoje. Nada de painel, número ou gráfico.
 */
export function Inicio() {
  const dados = useDados();
  const nova = useNovaAnotacao();
  const recentes = [...dados.vivas]
    .filter((p) => p.abertaEm)
    .sort((a, b) => b.abertaEm!.localeCompare(a.abertaEm!))
    .slice(0, 5);
  const hojeStr = hoje();
  const revisar = dados.vivas
    .filter((p) => p.revisarEm !== null && p.revisarEm <= hojeStr)
    .sort((a, b) => a.revisarEm!.localeCompare(b.revisarEm!));
  const naInbox = dados.vivas.filter((p) => estaNaInbox(p, dados)).length;
  const ultimoBackup = dados.config.ultimoBackupEm;
  const lembrarBackup = dados.vivas.length >= 3 && (!ultimoBackup || diasDesde(ultimoBackup) >= 30);
  const primeiraVez = dados.areas.length === 0 && dados.paginas.length === 0;

  return (
    <div className="tela">
      <h1 className="titulo-tela titulo-inicio">Meu Caderno</h1>

      <Link to="/buscar" className="busca-falsa">
        <Icone nome="buscar" tamanho={18} />
        <span>Buscar em tudo…</span>
      </Link>

      <button type="button" className="botao botao-principal botao-grande" onClick={() => void nova()}>
        <Icone nome="mais" /> Nova anotação
      </button>

      {primeiraVez && (
        <section className="cartao boas-vindas">
          <h2>Bem-vinda ao seu caderno</h2>
          <p>
            Tudo fica guardado neste aparelho. Para começar, use as áreas sugeridas — dá para renomear, apagar ou
            criar outras depois:
          </p>
          <p className="areas-sugeridas">{AREAS_SUGERIDAS.join(" · ")}</p>
          <button type="button" className="botao botao-leve" onClick={() => void criarAreasSugeridas()}>
            Usar estas áreas
          </button>
        </section>
      )}

      {naInbox > 0 && (
        <Link to="/inbox" className="faixa faixa-inbox">
          <Icone nome="inbox" tamanho={18} />
          <span>
            <strong>{naInbox}</strong> {naInbox === 1 ? "anotação espera" : "anotações esperam"} um lugar na Inbox
          </span>
        </Link>
      )}

      {revisar.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Para revisar hoje</h2>
          <ListaDePaginas paginas={revisar} />
        </section>
      )}

      {recentes.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Continue de onde parou</h2>
          <ListaDePaginas paginas={recentes} direita={(p) => <span className="data">{haQuanto(p.abertaEm!)}</span>} />
        </section>
      )}

      {lembrarBackup && (
        <Link to="/backup" className="lembrete">
          <Icone nome="backup" tamanho={16} />
          {ultimoBackup ? `Último backup ${haQuanto(ultimoBackup)}. Que tal baixar um novo?` : "Você ainda não baixou um backup."}
        </Link>
      )}
    </div>
  );
}
