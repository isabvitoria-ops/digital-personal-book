/** Entrega um arquivo para ela salvar (backup, página em .md). */
export function baixarArquivo(conteudo: Blob, nome: string) {
  const url = URL.createObjectURL(conteudo);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Foto de celular tem 4–8 MB e 4000 px de largura — muito mais do que uma
 * anotação precisa, e pesa no backup. Acima de 1,5 MB, reduz para 2000 px.
 * PDF, GIF e SVG passam intactos.
 */
export async function prepararImagem(arquivo: File): Promise<Blob> {
  const reduzivel = /^image\/(jpeg|png|webp)$/.test(arquivo.type);
  if (!reduzivel || arquivo.size < 1.5 * 1024 * 1024) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // PNG transparente não vira fundo preto no JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo;
  }
}

export function nomeComExtensaoJpg(nome: string, blob: Blob): string {
  if (blob.type !== "image/jpeg" || /\.jpe?g$/i.test(nome)) return nome;
  return nome.replace(/\.[^.]+$/, "") + ".jpg";
}
