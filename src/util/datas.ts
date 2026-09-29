/** O dia de hoje no fuso DELA (não em UTC), como "2026-09-29". */
export function hoje(referencia = new Date()): string {
  return diaLocal(referencia);
}

export function diaLocal(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${dia}`;
}

export type PrazoRevisao = "hoje" | "semana" | "mes" | "semestre";

export const NOMES_PRAZO: Record<PrazoRevisao, string> = {
  hoje: "Hoje",
  semana: "Em 1 semana",
  mes: "Em 1 mês",
  semestre: "Em 6 meses",
};

/**
 * A data de revisão a partir de hoje. Somar mês no calendário tem armadilha:
 * 31 de janeiro + 1 mês não é "31 de fevereiro". Aqui cai no último dia do
 * mês (28/29 de fevereiro), que é o que uma pessoa esperaria.
 */
export function dataDeRevisao(prazo: PrazoRevisao, referencia = new Date()): string {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  if (prazo === "semana") d.setDate(d.getDate() + 7);
  if (prazo === "mes" || prazo === "semestre") {
    const meses = prazo === "mes" ? 1 : 6;
    const dia = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + meses);
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ultimo));
  }
  return diaLocal(d);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "29 de set. de 2026" — curto, para listas. */
export function dataCurta(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]!.slice(0, 3)}. de ${d.getFullYear()}`;
}

/** Para o botão de revisar: "hoje", "amanhã", "29 de out." (ano só se for outro). */
export function diaCurto(dia: string, referencia = new Date()): string {
  if (dia === hoje(referencia)) return "hoje";
  const amanha = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate() + 1);
  if (dia === diaLocal(amanha)) return "amanhã";
  const d = new Date(dia + "T12:00:00");
  const base = `${d.getDate()} de ${MESES[d.getMonth()]!.slice(0, 3)}.`;
  return d.getFullYear() === referencia.getFullYear() ? base : `${base} de ${d.getFullYear()}`;
}

/** "29 de setembro de 2026, 14:03" — para o rodapé da página. */
export function dataCompleta(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}, ${h}:${min}`;
}

/** "setembro de 2026" — o cabeçalho da linha do tempo. */
export function mesEAno(iso: string): string {
  const d = new Date(iso);
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "há 3 dias", "ontem", "agora há pouco" — para "continue de onde parou". */
export function haQuanto(iso: string, referencia = new Date()): string {
  const segundos = Math.max(0, (referencia.getTime() - new Date(iso).getTime()) / 1000);
  if (segundos < 90) return "agora há pouco";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  const anos = Math.round(dias / 365);
  return anos <= 1 ? "há 1 ano" : `há ${anos} anos`;
}

/** Dias desde uma data (para o lembrete de backup). */
export function diasDesde(iso: string, referencia = new Date()): number {
  return Math.floor((referencia.getTime() - new Date(iso).getTime()) / 86_400_000);
}
