import { describe, expect, test } from "vitest";
import { dataDeRevisao, diaCurto, haQuanto, hoje } from "../src/util/datas";

describe("dataDeRevisao", () => {
  const ref = new Date(2026, 8, 29, 23, 30); // 29/09/2026, 23:30 local
  test("hoje, semana, mês, semestre", () => {
    expect(hoje(ref)).toBe("2026-09-29");
    expect(dataDeRevisao("hoje", ref)).toBe("2026-09-29");
    expect(dataDeRevisao("semana", ref)).toBe("2026-10-06");
    expect(dataDeRevisao("mes", ref)).toBe("2026-10-29");
    expect(dataDeRevisao("semestre", ref)).toBe("2027-03-29");
  });
  test("31 de janeiro + 1 mês cai no fim de fevereiro", () => {
    expect(dataDeRevisao("mes", new Date(2027, 0, 31))).toBe("2027-02-28");
    expect(dataDeRevisao("mes", new Date(2028, 0, 31))).toBe("2028-02-29");
  });
  test("31 de agosto + 6 meses", () => {
    expect(dataDeRevisao("semestre", new Date(2026, 7, 31))).toBe("2027-02-28");
  });
});

describe("haQuanto", () => {
  const ref = new Date("2026-09-29T12:00:00Z");
  test("faixas", () => {
    expect(haQuanto("2026-09-29T11:59:30Z", ref)).toBe("agora há pouco");
    expect(haQuanto("2026-09-29T11:30:00Z", ref)).toBe("há 30 min");
    expect(haQuanto("2026-09-28T12:00:00Z", ref)).toBe("ontem");
    expect(haQuanto("2026-09-19T12:00:00Z", ref)).toBe("há 10 dias");
    expect(haQuanto("2025-09-29T12:00:00Z", ref)).toBe("há 1 ano");
  });
});

describe("diaCurto", () => {
  const ref = new Date(2026, 8, 29, 10);
  test("hoje, amanhã, mesmo ano, outro ano", () => {
    expect(diaCurto("2026-09-29", ref)).toBe("hoje");
    expect(diaCurto("2026-09-30", ref)).toBe("amanhã");
    expect(diaCurto("2026-10-29", ref)).toBe("29 de out.");
    expect(diaCurto("2027-03-29", ref)).toBe("29 de mar. de 2027");
  });
});
