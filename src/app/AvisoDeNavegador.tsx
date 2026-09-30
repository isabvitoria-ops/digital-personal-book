import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Telas para quando o Caderno NÃO consegue abrir.
 *
 * Sem elas o app ficava em branco e sem dizer por quê: quem usa não tem como
 * saber se é o navegador, outra aba aberta ou defeito do app, e acha que o
 * Caderno está quebrado. Toda falha aqui vira uma frase com o que fazer, e o
 * detalhe técnico fica pequeno embaixo, para diagnóstico.
 */
export type Motivo = "armazenamento" | "outra-aba" | "erro";

const TEXTOS: Record<Motivo, { titulo: string; intro: string; passos: string[] }> = {
  armazenamento: {
    titulo: "Seu navegador não está deixando o Caderno guardar as anotações",
    intro:
      "O Caderno guarda tudo no próprio aparelho, dentro do navegador. Agora o navegador está bloqueando isso, então nada seria salvo. Tente, nesta ordem:",
    passos: [
      "Abra o endereço em uma janela normal (não anônima, não privada).",
      "Nas configurações do navegador, em Privacidade, deixe o site guardar dados (cookies e dados do site). Se estiver em “apagar tudo ao fechar”, desligue para este site.",
      "Ainda não funcionou? Abra no Edge ou no Firefox.",
    ],
  },
  "outra-aba": {
    titulo: "O Caderno está aberto em outra aba e está travando esta",
    intro: "Uma versão antiga do Caderno aberta em outra aba impede esta de abrir. Faça assim:",
    passos: [
      "Feche todas as outras abas ou janelas do Caderno.",
      "Volte a esta aba e toque em “Tentar de novo”.",
    ],
  },
  erro: {
    titulo: "O Caderno tropeçou e não conseguiu abrir",
    intro:
      "Suas anotações continuam guardadas no aparelho — isto é só um problema na tela. Tente “Tentar de novo”. Se repetir, me mande um print desta tela.",
    passos: [],
  },
};

export function AvisoDeNavegador({ motivo, detalhe }: { motivo: Motivo; detalhe: string }) {
  const t = TEXTOS[motivo];
  return (
    <main className="pagina" style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
      <h1>{t.titulo}</h1>
      <div className="cartao">
        <p>{t.intro}</p>
        {t.passos.length > 0 && (
          <ol>
            {t.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        )}
        <p style={{ fontSize: 13, opacity: 0.7, overflowWrap: "anywhere" }}>Detalhe técnico: {detalhe}</p>
        <button type="button" className="botao botao-principal" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}

/**
 * Se qualquer tela quebrar ao ser desenhada, o React desmonta o app inteiro e
 * sobra a página em branco. Isto segura o erro e mostra a tela de aviso.
 */
export class SeAlgoQuebrar extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("O Caderno quebrou ao desenhar a tela:", erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (erro) return <AvisoDeNavegador motivo="erro" detalhe={`${erro.name}: ${erro.message}`} />;
    return this.props.children;
  }
}
