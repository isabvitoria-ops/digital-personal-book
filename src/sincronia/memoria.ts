import { ConflitoRemoto, type Foto, type Mudanca, type Remoto } from "./remoto";

/**
 * Um "GitHub" de mentira, em memória — para testar a sincronização entre
 * dois aparelhos sem internet. Mesmo contrato do de verdade: versões, e
 * recusa de gravar em cima de versão velha.
 */
export class RemotoEmMemoria implements Remoto {
  versoes: { id: string; arquivos: Map<string, string> }[] = [];
  conteudos = new Map<string, Uint8Array>();
  commits = 0;
  /** Para testar conflito: roda antes de gravar (simula o outro aparelho). */
  antesDeGravar: (() => Promise<void>) | null = null;

  async foto(): Promise<Foto> {
    const v = this.versoes[this.versoes.length - 1];
    return { versao: v?.id ?? null, arquivos: new Map(v?.arquivos ?? []) };
  }

  async ler(id: string): Promise<Uint8Array> {
    const c = this.conteudos.get(id);
    if (!c) throw new Error(`conteúdo ${id} não existe`);
    return c;
  }

  async gravar(base: string | null, mudancas: Mudanca[], _mensagem: string): Promise<string> {
    if (this.antesDeGravar) {
      const f = this.antesDeGravar;
      this.antesDeGravar = null;
      await f();
    }
    const atual = this.versoes[this.versoes.length - 1];
    if ((atual?.id ?? null) !== base) throw new ConflitoRemoto();
    const arquivos = new Map(atual?.arquivos ?? []);
    for (const m of mudancas) {
      if (m.dados === null) arquivos.delete(m.caminho);
      else {
        const id = `b${this.conteudos.size + 1}`;
        this.conteudos.set(id, m.dados);
        arquivos.set(m.caminho, id);
      }
    }
    const id = `v${this.versoes.length + 1}`;
    this.versoes.push({ id, arquivos });
    this.commits++;
    return id;
  }

  caminhos(): string[] {
    return [...(this.versoes[this.versoes.length - 1]?.arquivos.keys() ?? [])].sort();
  }
}
