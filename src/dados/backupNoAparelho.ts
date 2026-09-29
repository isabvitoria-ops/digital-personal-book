import JSZip from "jszip";
import { db, lerConfig, salvarConfig } from "./banco";
import { agora } from "./ids";
import type { Anexo } from "./tipos";
import {
  caminhoDoAnexo,
  lerArquivoJson,
  montarArquivosDeTexto,
  planejarJuncao,
  type AnexoSemDados,
  type Pacote,
  type PlanoDeJuncao,
} from "./backup";
import { diaLocal } from "../util/datas";

function semDados(a: Anexo): AnexoSemDados {
  const { dados: _dados, ...resto } = a;
  return resto;
}

export async function lerPacoteLocal(): Promise<Pacote> {
  const [areas, cadernos, paginas, anexos, config] = await Promise.all([
    db.areas.toArray(),
    db.cadernos.toArray(),
    db.paginas.toArray(),
    db.anexos.toArray(),
    lerConfig(),
  ]);
  return { areas, cadernos, paginas, anexos: anexos.map(semDados), config: { nomesMarcadores: config.nomesMarcadores } };
}

export async function gerarBackup(): Promise<{ arquivo: Blob; nome: string }> {
  const exportadoEm = agora();
  const pacote = await lerPacoteLocal();
  const zip = new JSZip();
  for (const f of montarArquivosDeTexto(pacote, exportadoEm)) zip.file(f.caminho, f.conteudo);
  await db.anexos.each((a) => {
    zip.file(caminhoDoAnexo(a), a.dados);
  });
  const arquivo = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  await salvarConfig({ ultimoBackupEm: exportadoEm });
  return { arquivo, nome: `meu-caderno-${diaLocal(new Date())}.zip` };
}

export interface ResultadoRestauracao {
  resumo: PlanoDeJuncao["resumo"];
  anexosNovos: number;
  anexosFaltando: number;
}

export async function restaurarBackup(arquivo: Blob): Promise<ResultadoRestauracao> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arquivo);
  } catch {
    throw new Error("Não consegui abrir este arquivo. Ele precisa ser o .zip baixado pelo app.");
  }
  const json = zip.file("caderno.json");
  if (!json) throw new Error("Este .zip não tem o caderno.json — não parece um backup do Meu Caderno.");
  const vindo = lerArquivoJson(await json.async("string"));
  const plano = planejarJuncao(await lerPacoteLocal(), vindo);

  // Lê os anexos ANTES de abrir a transação: o IndexedDB fecha a transação
  // sozinho se ela ficar esperando outra coisa (como descompactar um PDF).
  const anexos: Anexo[] = [];
  let anexosFaltando = 0;
  for (const a of plano.anexos) {
    const f = zip.file(caminhoDoAnexo(a));
    if (!f) {
      anexosFaltando++;
      continue;
    }
    const dados = new Blob([await f.async("arraybuffer")], { type: a.tipo });
    anexos.push({ ...a, dados });
  }

  await db.transaction("rw", [db.areas, db.cadernos, db.paginas, db.anexos], async () => {
    await db.areas.bulkPut(plano.areas);
    await db.cadernos.bulkPut(plano.cadernos);
    await db.paginas.bulkPut(plano.paginas);
    await db.anexos.bulkPut(anexos);
  });

  return { resumo: plano.resumo, anexosNovos: anexos.length, anexosFaltando };
}
