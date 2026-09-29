const LETRAS = "abcdefghijkmnpqrstuvwxyz23456789";

/**
 * Um id curto, sem letras que se confundem (l, 1, o, 0). Doze caracteres de
 * um alfabeto de 32 dão 60 bits — sobra para uma vida de anotações.
 */
export function novoId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += LETRAS[b % LETRAS.length];
  return id;
}

export const agora = () => new Date().toISOString();
