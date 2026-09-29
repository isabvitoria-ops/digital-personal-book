import { db } from "../dados/banco";
import { baixarArquivo } from "../util/arquivos";

/**
 * O endereço temporário (blob:) de um anexo, para a imagem aparecer e o PDF
 * abrir. É criado uma vez por anexo e reaproveitado enquanto o app está
 * aberto.
 */
const enderecos = new Map<string, string>();

export async function enderecoDoAnexo(id: string): Promise<string | null> {
  const pronto = enderecos.get(id);
  if (pronto) return pronto;
  const anexo = await db.anexos.get(id);
  if (!anexo) return null;
  const url = URL.createObjectURL(anexo.dados);
  enderecos.set(id, url);
  return url;
}

/** Abre o PDF (ou a imagem) no leitor do aparelho. Se o navegador barrar, baixa. */
export async function abrirAnexo(id: string): Promise<boolean> {
  const anexo = await db.anexos.get(id);
  if (!anexo) return false;
  const url = await enderecoDoAnexo(id);
  const janela = url ? window.open(url, "_blank", "noopener") : null;
  if (!janela) baixarArquivo(anexo.dados, anexo.nome);
  return true;
}
