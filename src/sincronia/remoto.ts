/**
 * O "outro lado" da sincronização, visto de forma simples: um conjunto de
 * arquivos numa versão (commit), que se lê e se regrava de uma vez.
 *
 * A implementação de verdade é o GitHub (github.ts). Os testes usam uma
 * versão em memória com o mesmo contrato.
 */
export interface Foto {
  /** A versão lida (null = repositório vazio). */
  versao: string | null;
  /** caminho → identificador do conteúdo */
  arquivos: Map<string, string>;
}

export interface Mudanca {
  caminho: string;
  /** null = apagar o arquivo */
  dados: Uint8Array | null;
}

/** Outro aparelho gravou no meio: é só sincronizar de novo. */
export class ConflitoRemoto extends Error {
  constructor() {
    super("O repositório mudou durante a sincronização.");
  }
}

export interface Remoto {
  foto(): Promise<Foto>;
  ler(id: string): Promise<Uint8Array>;
  /** Grava tudo numa versão nova a partir de `base`; falha com ConflitoRemoto se `base` ficou velha. */
  gravar(base: string | null, mudancas: Mudanca[], mensagem: string): Promise<string>;
}

export const texto = (b: Uint8Array) => new TextDecoder().decode(b);
export const bytes = (t: string) => new TextEncoder().encode(t);
