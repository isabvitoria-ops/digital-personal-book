import { db } from "../dados/banco";
import { agora } from "../dados/ids";
import type { Anexo, Pagina } from "../dados/tipos";
import {
  arquivoParaPagina,
  caminhoAnexo,
  caminhoPagina,
  FORMATO,
  LEIA_ME_REPO,
  manifestoVazio,
  montarIndice,
  paginaParaArquivo,
  VERSAO,
  type Estrutura,
  type Manifesto,
} from "./formato";
import { planejar } from "./plano";
import { bytes, ConflitoRemoto, texto, type Mudanca, type Remoto } from "./remoto";

export interface Resumo {
  recebidas: number;
  enviadas: number;
  anexosRecebidos: number;
  anexosEnviados: number;
  apagados: number;
  gravouRemoto: boolean;
}

/** JSON com as chaves em ordem: o mesmo conteúdo gera sempre o mesmo arquivo. */
function jsonEstavel(v: unknown): string {
  const ordenar = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(ordenar)
      : x && typeof x === "object"
        ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, ordenar((x as Record<string, unknown>)[k])]))
        : x;
  return JSON.stringify(ordenar(v), null, 1) + "\n";
}

/**
 * Sincroniza este aparelho com o repositório. Se outro aparelho gravar no
 * meio do caminho, recomeça (até 3 vezes).
 */
export async function sincronizar(remoto: Remoto): Promise<Resumo> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await umaVez(remoto);
    } catch (e) {
      if (e instanceof ConflitoRemoto && tentativa < 2) continue;
      throw e;
    }
  }
}

async function umaVez(remoto: Remoto): Promise<Resumo> {
  const foto = await remoto.foto();
  const lerTexto = async (caminho: string) => {
    const id = foto.arquivos.get(caminho);
    return id ? texto(await remoto.ler(id)) : null;
  };

  const manifestoTxt = await lerTexto("sincronia.json");
  const manifesto: Manifesto = manifestoTxt ? JSON.parse(manifestoTxt) : manifestoVazio();
  if (manifesto.formato !== FORMATO) throw new Error("O repositório tem outro conteúdo — não parece ser do Meu Caderno.");
  if (manifesto.versao > VERSAO) throw new Error("O repositório foi gravado por uma versão mais nova do app. Recarregue a página.");
  const estruturaTxt = await lerTexto("estrutura.json");
  const estruturaRemota: Estrutura = estruturaTxt ? JSON.parse(estruturaTxt) : { areas: [], cadernos: [] };

  const [areas, cadernos, paginas, anexos, apagados] = await Promise.all([
    db.areas.toArray(),
    db.cadernos.toArray(),
    db.paginas.toArray(),
    db.anexos.toArray(),
    db.apagados.toArray(),
  ]);
  const plano = planejar(
    {
      areas,
      cadernos,
      paginas,
      anexos: anexos.map(({ dados: _d, ...resto }) => resto),
      apagados,
    },
    manifesto,
    estruturaRemota,
  );

  // 1. Baixa o que o remoto tem de mais novo (antes de mexer no banco: o
  //    IndexedDB fecha a transação se ela esperar a internet).
  const recebidas: Omit<Pagina, "abertaEm">[] = [];
  for (const id of plano.baixarPaginas) {
    const t = await lerTexto(caminhoPagina(id));
    if (t) recebidas.push(arquivoParaPagina(t));
  }
  const anexosRecebidos: Anexo[] = [];
  for (const id of plano.baixarAnexos) {
    const meta = manifesto.anexos[id]!;
    const sha = foto.arquivos.get(caminhoAnexo({ id, nome: meta.nome }));
    if (!sha) continue;
    const dados = new Blob([(await remoto.ler(sha)) as BlobPart], { type: meta.tipo });
    anexosRecebidos.push({ id, ...meta, dados });
  }

  // 2. Aplica aqui, de uma vez.
  await db.transaction("rw", [db.areas, db.cadernos, db.paginas, db.anexos, db.apagados], async () => {
    await db.areas.bulkPut(plano.gravarAqui.areas);
    await db.cadernos.bulkPut(plano.gravarAqui.cadernos);
    for (const p of recebidas) {
      const atual = await db.paginas.get(p.id);
      // Se ela editou esta página durante a sincronização, a edição dela vence.
      if (atual && atual.atualizadaEm >= p.atualizadaEm) continue;
      await db.paginas.put({ ...p, abertaEm: atual?.abertaEm ?? null });
    }
    await db.anexos.bulkPut(anexosRecebidos);
    for (const a of plano.apagarAqui) {
      if (a.tipo === "pagina") await db.paginas.delete(a.id);
      else if (a.tipo === "anexo") await db.anexos.delete(a.id);
      else if (a.tipo === "caderno") await db.cadernos.delete(a.id);
      else await db.areas.delete(a.id);
    }
    await db.apagados.bulkPut(plano.apagadosUnidos);
  });

  // 3. Monta o que sobe.
  const mudancas: Mudanca[] = [];
  for (const id of plano.subirPaginas) {
    const p = await db.paginas.get(id);
    if (!p) continue;
    plano.manifesto.paginas[id] = { atualizadaEm: p.atualizadaEm, excluidaEm: p.excluidaEm };
    mudancas.push({ caminho: caminhoPagina(id), dados: bytes(paginaParaArquivo(p)) });
  }
  for (const id of plano.subirAnexos) {
    const a = await db.anexos.get(id);
    if (a) mudancas.push({ caminho: caminhoAnexo(a), dados: new Uint8Array(await a.dados.arrayBuffer()) });
  }
  for (const x of plano.apagarLa) {
    const caminho =
      x.tipo === "pagina" ? caminhoPagina(x.id) : caminhoAnexo({ id: x.id, nome: manifesto.anexos[x.id]?.nome ?? "" });
    if (foto.arquivos.has(caminho)) mudancas.push({ caminho, dados: null });
  }

  const novaEstrutura = jsonEstavel(plano.estrutura);
  if (novaEstrutura !== (estruturaTxt ?? "")) mudancas.push({ caminho: "estrutura.json", dados: bytes(novaEstrutura) });
  const novoManifesto = jsonEstavel(plano.manifesto);
  const indice = montarIndice(plano.estrutura, await db.paginas.toArray()) + "\n";
  if (indice !== ((await lerTexto("INDICE.md")) ?? "")) mudancas.push({ caminho: "INDICE.md", dados: bytes(indice) });
  if (!foto.arquivos.has("LEIA-ME.md")) mudancas.push({ caminho: "LEIA-ME.md", dados: bytes(LEIA_ME_REPO) });
  // O manifesto só é regravado se algo mudou de verdade.
  const precisaManifesto = mudancas.length > 0 || novoManifesto !== (manifestoTxt ?? "");
  if (precisaManifesto) mudancas.push({ caminho: "sincronia.json", dados: bytes(novoManifesto) });

  if (mudancas.length > 0) {
    const n = plano.subirPaginas.length;
    await remoto.gravar(foto.versao, mudancas, n > 0 ? `Caderno: ${n} ${n === 1 ? "página" : "páginas"}` : "Caderno: sincronização");
  }

  return {
    recebidas: recebidas.length,
    enviadas: plano.subirPaginas.length,
    anexosRecebidos: anexosRecebidos.length,
    anexosEnviados: plano.subirAnexos.length,
    apagados: plano.apagarAqui.length,
    gravouRemoto: mudancas.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Configuração (fica só neste aparelho)
// ---------------------------------------------------------------------------

export async function lerSincronia() {
  return db.sincronia.get("github");
}

export async function salvarSincronia(repo: string, token: string) {
  await db.sincronia.put({ chave: "github", repo: repo.trim(), token: token.trim(), ultimaEm: null, ultimoErro: null });
}

export async function registrarResultado(erro: string | null) {
  const atual = await lerSincronia();
  if (!atual) return;
  await db.sincronia.put({ ...atual, ultimaEm: erro ? atual.ultimaEm : agora(), ultimoErro: erro });
}

export async function desconectar() {
  await db.sincronia.delete("github");
}
