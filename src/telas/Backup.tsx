import { useEffect, useRef, useState } from "react";
import { useDados } from "../app/Dados";
import { useDialogos } from "../app/Dialogos";
import { pedirArmazenamentoPersistente } from "../dados/banco";
import { gerarBackup, restaurarBackup } from "../dados/backupNoAparelho";
import { baixarArquivo, tamanhoLegivel } from "../util/arquivos";
import { dataCompleta, haQuanto } from "../util/datas";
import { Icone } from "../componentes/Icone";

export function Backup() {
  const dados = useDados();
  const { confirmar, avisar } = useDialogos();
  const [trabalhando, definirTrabalhando] = useState<"" | "baixando" | "restaurando">("");
  const [resultado, definirResultado] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [protegido, definirProtegido] = useState<boolean | null>(null);
  const [espaco, definirEspaco] = useState<{ usado: number; total: number } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const ultimo = dados.config.ultimoBackupEm;

  useEffect(() => {
    void navigator.storage?.persisted?.().then(definirProtegido);
    void navigator.storage?.estimate?.().then((e) => e.usage !== undefined && e.quota && definirEspaco({ usado: e.usage, total: e.quota }));
  }, []);

  async function baixar() {
    definirErro(null);
    definirResultado(null);
    definirTrabalhando("baixando");
    try {
      const { arquivo, nome } = await gerarBackup();
      baixarArquivo(arquivo, nome);
      definirResultado(`Backup pronto: ${nome} (${tamanhoLegivel(arquivo.size)}). Guarde no Drive, no iCloud ou num pen drive.`);
    } catch (e) {
      definirErro(`Não consegui gerar o backup: ${(e as Error).message}`);
    } finally {
      definirTrabalhando("");
    }
  }

  async function restaurar(arquivo: File) {
    definirErro(null);
    definirResultado(null);
    const ok = await confirmar({
      titulo: "Restaurar este backup?",
      texto:
        "Ele se junta ao que já está aqui. Nada é apagado: quando a mesma página existe nos dois, fica a versão editada por último.",
      confirmar: "Restaurar",
    });
    if (!ok) return;
    definirTrabalhando("restaurando");
    try {
      const r = await restaurarBackup(arquivo);
      const partes = [
        `${r.resumo.novas} ${r.resumo.novas === 1 ? "página nova" : "páginas novas"}`,
        `${r.resumo.atualizadas} ${r.resumo.atualizadas === 1 ? "atualizada" : "atualizadas"}`,
        `${r.resumo.iguais} já ${r.resumo.iguais === 1 ? "estava" : "estavam"} em dia`,
      ];
      if (r.anexosNovos) partes.push(`${r.anexosNovos} ${r.anexosNovos === 1 ? "anexo" : "anexos"}`);
      definirResultado(`Pronto: ${partes.join(", ")}.`);
      if (r.anexosFaltando) definirErro(`${r.anexosFaltando} anexo(s) citados no backup não estavam dentro do .zip.`);
      avisar("Backup restaurado.");
    } catch (e) {
      definirErro((e as Error).message);
    } finally {
      definirTrabalhando("");
    }
  }

  return (
    <div className="tela">
      <h1 className="titulo-tela">Backup</h1>

      <section className="cartao">
        <h2>Onde suas anotações estão</h2>
        <p>
          Só <strong>neste aparelho</strong>, dentro do navegador. Nada vai para a internet. Por isso o backup é seu
          seguro: se o aparelho quebrar ou o navegador for limpo, é ele que traz tudo de volta.
        </p>
        <p className="dica">
          {ultimo ? (
            <>
              Último backup: {dataCompleta(ultimo)} ({haQuanto(ultimo)}).
            </>
          ) : (
            "Você ainda não baixou nenhum backup."
          )}
        </p>
        <button type="button" className="botao botao-principal" disabled={!!trabalhando} onClick={() => void baixar()}>
          <Icone nome="backup" tamanho={18} /> {trabalhando === "baixando" ? "Preparando…" : "Baixar backup (.zip)"}
        </button>
        <p className="dica">
          Dentro do .zip, cada página é um arquivo de texto que abre em qualquer computador, mesmo sem este app. Os
          PDFs e imagens vão juntos.
        </p>
      </section>

      <section className="cartao">
        <h2>Restaurar de um backup</h2>
        <p>
          Para trocar de aparelho ou recuperar algo. <strong>Não apaga nada</strong>: junta o backup com o que já está
          aqui.
        </p>
        <button type="button" className="botao botao-leve" disabled={!!trabalhando} onClick={() => entrada.current?.click()}>
          {trabalhando === "restaurando" ? "Restaurando…" : "Escolher o arquivo .zip"}
        </button>
        <input
          ref={entrada}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void restaurar(f);
          }}
        />
      </section>

      {resultado && (
        <div className="faixa faixa-ok" role="status">
          {resultado}
        </div>
      )}
      {erro && (
        <div className="faixa faixa-alerta" role="alert">
          {erro}
        </div>
      )}

      <section className="cartao">
        <h2>Proteção do navegador</h2>
        <p>
          {protegido === true && "Ativada: o navegador prometeu não apagar os dados sozinho."}
          {protegido === false && (
            <>
              Ainda não ativada. Instale o app na tela de início (veja abaixo) e toque em “Pedir proteção”. Mesmo assim,
              mantenha o backup em dia.
            </>
          )}
          {protegido === null && "Este navegador não informa."}
        </p>
        {protegido === false && (
          <button
            type="button"
            className="botao botao-leve"
            onClick={() =>
              void pedirArmazenamentoPersistente().then((r) => {
                definirProtegido(r);
                avisar(r ? "Proteção ativada." : "O navegador não aceitou agora. Tente de novo depois de instalar o app.");
              })
            }
          >
            Pedir proteção
          </button>
        )}
        {espaco && (
          <p className="dica">
            Espaço usado: {tamanhoLegivel(espaco.usado)} de {tamanhoLegivel(espaco.total)} disponíveis.
          </p>
        )}
      </section>

      <section className="cartao">
        <h2>Instalar como app</h2>
        <p>
          <strong>iPhone (Safari):</strong> botão de compartilhar → “Adicionar à Tela de Início”.
          <br />
          <strong>Android (Chrome):</strong> menu ⋮ → “Instalar app”.
          <br />
          <strong>Computador (Chrome ou Edge):</strong> ícone de instalar na barra de endereço.
        </p>
        <p className="dica">
          Instalado, ele abre como app, funciona sem internet e fica bem mais protegido da limpeza automática do
          Safari, que apaga os dados de sites comuns depois de 7 dias sem visita.
        </p>
      </section>
    </div>
  );
}
