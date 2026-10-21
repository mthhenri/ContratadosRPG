import { ArquetipoEnum, ClasseEnum, CenaTipoEnum, HabilidadeCategoriaEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';

import {
  ICONE_CLASSE,
  ICONE_ARQUETIPO,
  ICONE_CATEGORIA_HABILIDADE,
  ICONE_REACAO,
  ICONE_TIPO_DANO,
  ICONE_TIPO_CENA,
  ICONE_CENAS,
  iconeTipoCena,
  iconeDefesa,
  iconeTipoDano,
  iconesIdentidade,
} from './icones-dominio';

describe('icones-dominio', () => {
  it("cobre todas as classes e arquétipos com identidades já aprovadas", () => {
    expect(Object.keys(ICONE_CLASSE).sort()).toEqual(Object.values(ClasseEnum).sort());
    expect(Object.keys(ICONE_ARQUETIPO).sort()).toEqual(Object.values(ArquetipoEnum).sort());
    expect(Object.values(ICONE_CLASSE)).toEqual([
      "combatente", "especialista", "suporte", "bestial", "artificial", "hibrido", "civil",
    ]);
    expect(Object.values(ICONE_ARQUETIPO)).toEqual([
      "lutador", "mercenario", "vanguarda", "engenheiro", "assassino", "academico",
      "paramedico", "diplomata", "comandante",
    ]);
  });
  it("divide a identidade como o rótulo: classe-base + arquétipo, classe-base + subclasse, Civil sozinho", () => {
    expect(iconesIdentidade(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR)).toEqual({ classeBase: "combatente", subclasse: "lutador" });
    expect(iconesIdentidade(ClasseEnum.SUPORTE, null)).toEqual({ classeBase: "suporte", subclasse: null });
    expect(iconesIdentidade(ClasseEnum.EXPERIMENTO_BESTIAL, null)).toEqual({ classeBase: "combatente", subclasse: "bestial" });
    expect(iconesIdentidade(ClasseEnum.EXPERIMENTO_ARTIFICIAL, null)).toEqual({ classeBase: "especialista", subclasse: "artificial" });
    expect(iconesIdentidade(ClasseEnum.EXPERIMENTO_HIBRIDO, null)).toEqual({ classeBase: "suporte", subclasse: "hibrido" });
    expect(iconesIdentidade(ClasseEnum.CIVIL, null)).toEqual({ classeBase: "civil", subclasse: null });
  });
  it('cobre cada tipo de cena com um desenho distinto e reserva o genérico', () => {
    const desenhos = Object.values(CenaTipoEnum).map(tipo => iconeTipoCena(tipo));
    expect(desenhos).toEqual(Object.values(CenaTipoEnum).map(tipo => ICONE_TIPO_CENA[tipo]));
    expect(desenhos.every(nome => nome.startsWith('cena-'))).toBe(true);
    expect(new Set([...desenhos, ICONE_CENAS]).size).toBe(desenhos.length + 1);
    expect(iconeTipoCena(null)).toBe('cenas');
    expect(iconeTipoCena(undefined)).toBe('cenas');
  });
  it('cobre todos os tipos de dano e todas as categorias de habilidade', () => {
    for (const tipo of Object.values(TipoDanoEnum)) {
      expect(ICONE_TIPO_DANO[tipo]).toMatch(/^dano-/);
    }
    for (const categoria of Object.values(HabilidadeCategoriaEnum)) {
      expect(ICONE_CATEGORIA_HABILIDADE[categoria]).toMatch(/^habilidade-/);
    }
  });

  it('usa um ícone distinto por conceito', () => {
    const nomes = [
      ...Object.values(ICONE_TIPO_DANO),
      ...Object.values(ICONE_CATEGORIA_HABILIDADE),
      ...Object.values(ICONE_REACAO),
    ];
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('iconeTipoDano devolve null para texto que não é um tipo de dano', () => {
    expect(iconeTipoDano('Físico')).toBe('dano-fisico');
    expect(iconeTipoDano('Fís')).toBeNull();
    expect(iconeTipoDano('')).toBeNull();
    expect(iconeTipoDano(undefined)).toBeNull();
  });

  it('iconeDefesa mapeia os rótulos de defesa do encontro', () => {
    expect(iconeDefesa('Defesa')).toBe('defesa');
    expect(iconeDefesa('Esquiva')).toBe('reacao-esquiva');
    expect(iconeDefesa('Bloqueio')).toBe('reacao-bloqueio');
    expect(iconeDefesa('Contra')).toBe('reacao-contra-ataque');
    expect(iconeDefesa('Contra-ataque')).toBe('reacao-contra-ataque');
    expect(iconeDefesa('Esq')).toBeNull();
  });
});
