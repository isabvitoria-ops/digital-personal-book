import { useState } from "react";
import { useSincronia } from "../app/Sincronia";
import { useDialogos } from "../app/Dialogos";
import { RemotoGitHub } from "../sincronia/github";
import { desconectar, salvarSincronia } from "../sincronia/sincronizar";
import { haQuanto } from "../util/datas";
import { Icone } from "./Icone";

/**
 * Ligar a sincronização: um repositório PRIVADO dela + uma chave que só
 * enxerga esse repositório. O passo a passo é para quem nunca fez isso.
 */
export function SincroniaCartao() {
  const s = useSincronia();
  const { confirmar, avisar } = useDialogos();
  const [repo, definirRepo] = useState("isabvitoria-ops/caderno-dados");
  const [token, definirToken] = useState("");
  const [conferindo, definirConferindo] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    definirErro(null);
    const nome = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(nome)) {
      definirErro("Escreva no formato dona/repositorio — por exemplo isabvitoria-ops/caderno-dados.");
      return;
    }
    definirConferindo(true);
    try {
      await new RemotoGitHub(nome, token.trim()).conferir();
      await salvarSincronia(nome, token.trim());
      definirToken("");
      const r = await s.sincronizarAgora();
      avisar(r ? "Conectado e sincronizado." : "Conectado.");
    } catch (e) {
      definirErro(e instanceof Error ? e.message : String(e));
    } finally {
      definirConferindo(false);
    }
  }

  async function sair() {
    const ok = await confirmar({
      titulo: "Desligar a sincronização neste aparelho?",
      texto: "Nada é apagado — nem aqui, nem no repositório. Este aparelho só para de enviar e receber.",
      confirmar: "Desligar",
    });
    if (ok) await desconectar();
  }

  if (s.configurada) {
    return (
      <section className="cartao">
        <h2>Sincronizar entre aparelhos</h2>
        <p>
          <strong>Ligada</strong> neste aparelho
          {s.sincronizando ? " — sincronizando agora…" : s.ultimaEm ? ` — última vez ${haQuanto(s.ultimaEm)}.` : "."}
        </p>
        {s.erro && !s.sincronizando && (
          <div className="faixa faixa-alerta" role="alert">
            A última tentativa falhou: {s.erro}
          </div>
        )}
        <div className="linha-botoes">
          <button type="button" className="botao botao-principal" disabled={s.sincronizando} onClick={() => void s.sincronizarAgora()}>
            <Icone nome="revisar" tamanho={18} /> Sincronizar agora
          </button>
          <button type="button" className="botao botao-leve" onClick={() => void sair()}>
            Desligar
          </button>
        </div>
        <p className="dica">
          Sincroniza sozinho ao abrir o app e a cada 3 minutos. Repositório:{" "}
          <a href={`https://github.com/${s.repo}`} target="_blank" rel="noopener noreferrer">
            {s.repo}
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="cartao">
      <h2>Sincronizar entre aparelhos</h2>
      <p>
        Para o celular e o computador verem as mesmas anotações, o caderno guarda uma cópia num repositório{" "}
        <strong>privado</strong> seu no GitHub. Faz uma vez em cada aparelho:
      </p>
      <ol className="passos">
        <li>
          <strong>Criar o repositório (só na primeira vez).</strong> Abra{" "}
          <a href="https://github.com/new" target="_blank" rel="noopener noreferrer">github.com/new</a>, nome{" "}
          <code>caderno-dados</code>, marque <strong>Private</strong> e clique em <em>Create repository</em>.
        </li>
        <li>
          <strong>Criar a chave.</strong> Abra{" "}
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
            github.com/settings/personal-access-tokens/new
          </a>
          . Nome: <code>caderno</code>. Em <em>Expiration</em>, o prazo mais longo. Em <em>Repository access</em>:{" "}
          <em>Only select repositories</em> → <code>caderno-dados</code>. Em <em>Permissions</em> →{" "}
          <em>Repository permissions</em> → <em>Contents</em>: <strong>Read and write</strong>. Clique em{" "}
          <em>Generate token</em> e copie (começa com <code>github_pat_</code>).
        </li>
        <li>Cole abaixo e toque em Conectar.</li>
      </ol>
      <form onSubmit={(e) => void conectar(e)}>
        <label className="campo">
          <span className="campo-rotulo">Repositório</span>
          <input value={repo} onChange={(e) => definirRepo(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Chave</span>
          <input
            type="password"
            value={token}
            onChange={(e) => definirToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="botao botao-principal" disabled={conferindo || !token.trim()}>
          {conferindo ? "Conferindo…" : "Conectar"}
        </button>
      </form>
      {erro && (
        <div className="faixa faixa-alerta" role="alert">
          {erro}
        </div>
      )}
      <p className="dica">
        A chave fica só neste aparelho e só abre esse repositório. O app se recusa a usar repositório público.
      </p>
    </section>
  );
}
