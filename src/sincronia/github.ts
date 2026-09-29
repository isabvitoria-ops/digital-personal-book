import { ConflitoRemoto, type Foto, type Mudanca, type Remoto } from "./remoto";

/**
 * O repositório PRIVADO de dados no GitHub, pela API oficial.
 *
 * Cada sincronização vira UM commit (blobs → árvore → commit → mover a
 * branch). Se outro aparelho gravou no meio, o GitHub recusa mover a branch
 * e a sincronização recomeça — nada é sobrescrito às cegas.
 *
 * Trava de segurança: o app se RECUSA a sincronizar com repositório público.
 */

export class ErroGitHub extends Error {
  constructor(
    mensagem: string,
    public status?: number,
  ) {
    super(mensagem);
  }
}

function base64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(t: string): Uint8Array {
  const bin = atob(t.replace(/\n/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class RemotoGitHub implements Remoto {
  private ramo: string | null = null;

  constructor(
    private repo: string,
    private token: string,
  ) {}

  private async api<T>(caminho: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
    let r: Response;
    try {
      r = await fetch(`https://api.github.com/repos/${this.repo}${caminho}`, {
        method: opcoes.metodo ?? "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(opcoes.corpo ? { "Content-Type": "application/json" } : {}),
        },
        body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
        cache: "no-store",
      });
    } catch {
      throw new ErroGitHub("Sem conexão com o GitHub.");
    }
    if (r.ok) return (r.status === 204 ? null : await r.json()) as T;
    const msg = ((await r.json().catch(() => ({}))) as { message?: string }).message ?? "";
    if (r.status === 401) throw new ErroGitHub("A chave do GitHub foi recusada (vencida ou colada errada).", 401);
    if (r.status === 403) throw new ErroGitHub("A chave do GitHub não tem permissão de escrita neste repositório.", 403);
    if (r.status === 404) throw new ErroGitHub("Repositório não encontrado — confira o nome, e se a chave dá acesso a ele.", 404);
    throw new ErroGitHub(`GitHub respondeu ${r.status}: ${msg}`, r.status);
  }

  /** Confere o repositório: existe, é privado, e a chave pode escrever. */
  async conferir(): Promise<void> {
    const info = await this.api<{ private: boolean; default_branch: string; permissions?: { push?: boolean } }>("");
    if (!info.private) {
      throw new ErroGitHub("Este repositório é PÚBLICO. Por segurança, o caderno só sincroniza com repositório privado.");
    }
    if (info.permissions && info.permissions.push === false) {
      throw new ErroGitHub("A chave só pode ler este repositório. Ela precisa de permissão de escrita (Contents: Read and write).");
    }
    this.ramo = info.default_branch;
  }

  async foto(): Promise<Foto> {
    if (!this.ramo) await this.conferir();
    let ref: { object: { sha: string } };
    try {
      ref = await this.api(`/git/ref/heads/${this.ramo}`);
    } catch (e) {
      // Repositório sem nenhum commit ainda.
      if (e instanceof ErroGitHub && (e.status === 409 || e.status === 404)) return { versao: null, arquivos: new Map() };
      throw e;
    }
    const commit = await this.api<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
    const arvore = await this.api<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
      `/git/trees/${commit.tree.sha}?recursive=1`,
    );
    if (arvore.truncated) throw new ErroGitHub("O repositório ficou grande demais para a API listar de uma vez.");
    return {
      versao: ref.object.sha,
      arquivos: new Map(arvore.tree.filter((t) => t.type === "blob").map((t) => [t.path, t.sha])),
    };
  }

  async ler(sha: string): Promise<Uint8Array> {
    const blob = await this.api<{ content: string; encoding: string }>(`/git/blobs/${sha}`);
    return blob.encoding === "base64" ? deBase64(blob.content) : new TextEncoder().encode(blob.content);
  }

  async gravar(base: string | null, mudancas: Mudanca[], mensagem: string): Promise<string> {
    if (!this.ramo) await this.conferir();
    if (base === null) {
      // Repositório vazio: a API de árvores não funciona sem um primeiro commit.
      await this.api(`/contents/.caderno`, {
        metodo: "PUT",
        corpo: { message: "Começar o caderno", content: base64(new TextEncoder().encode("caderno\n")), branch: this.ramo },
      });
      const f = await this.foto();
      base = f.versao;
    }
    const commitBase = await this.api<{ tree: { sha: string } }>(`/git/commits/${base}`);
    const itens: { path: string; mode: string; type: string; sha: string | null }[] = [];
    for (const m of mudancas) {
      if (m.dados === null) {
        itens.push({ path: m.caminho, mode: "100644", type: "blob", sha: null });
      } else {
        const blob = await this.api<{ sha: string }>(`/git/blobs`, {
          metodo: "POST",
          corpo: { content: base64(m.dados), encoding: "base64" },
        });
        itens.push({ path: m.caminho, mode: "100644", type: "blob", sha: blob.sha });
      }
    }
    const arvore = await this.api<{ sha: string }>(`/git/trees`, {
      metodo: "POST",
      corpo: { base_tree: commitBase.tree.sha, tree: itens },
    });
    const commit = await this.api<{ sha: string }>(`/git/commits`, {
      metodo: "POST",
      corpo: { message: mensagem, tree: arvore.sha, parents: [base] },
    });
    try {
      await this.api(`/git/refs/heads/${this.ramo}`, { metodo: "PATCH", corpo: { sha: commit.sha, force: false } });
    } catch (e) {
      if (e instanceof ErroGitHub && e.status === 422) throw new ConflitoRemoto();
      throw e;
    }
    return commit.sha;
  }
}
