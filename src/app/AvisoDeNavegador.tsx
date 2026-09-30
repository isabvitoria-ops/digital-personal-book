/**
 * Tela que aparece quando o navegador NÃO deixa o Caderno guardar nada.
 *
 * Sem isto, o app abria em branco e sem dizer por quê: quem usa não tem como
 * saber que o problema é o navegador (aba anônima, "não guardar dados do
 * site", bloqueio por política da empresa) e acha que o Caderno está quebrado.
 */
export function AvisoDeNavegador({ detalhe }: { detalhe: string }) {
  return (
    <main className="pagina" style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
      <h1>Seu navegador não está deixando o Caderno guardar as anotações</h1>
      <div className="cartao">
        <p>
          O Caderno guarda tudo <strong>no próprio aparelho</strong>, dentro do navegador. Agora o
          navegador está bloqueando isso, então nada seria salvo. Tente, nesta ordem:
        </p>
        <ol>
          <li>
            Abra o endereço em uma <strong>janela normal</strong> (não anônima, não privada).
          </li>
          <li>
            Nas configurações do navegador, em <strong>Privacidade</strong>, deixe o site
            guardar dados (cookies e dados do site). Se estiver em “apagar tudo ao fechar”,
            desligue para este site.
          </li>
          <li>
            Ainda não funcionou? Abra no <strong>Chrome</strong> ou no <strong>Edge</strong>.
          </li>
        </ol>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Detalhe técnico: {detalhe}</p>
        <button type="button" className="botao botao-principal" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
