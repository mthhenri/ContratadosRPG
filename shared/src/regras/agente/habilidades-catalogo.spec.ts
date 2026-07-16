import { describe, expect, it } from 'vitest';

import {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  RolagemEfeitoAlvoEnum,
  RolagemEfeitoTipoEnum,
  TipoDanoEnum,
} from '../../enums';
import type { RolagemEfeitoDto } from '../rolagem';
import {
  catalogoHabilidades,
  ehHabilidadeInicial,
  habilidadesIniciais,
  type GrupoHabilidades,
  type SubgrupoHabilidades,
} from './habilidades-catalogo';
import {
  HABILIDADES_ARQUETIPO,
  HABILIDADES_CLASSE,
  HABILIDADES_GERAIS,
  HABILIDADES_GERAIS_MELHORADAS,
  HABILIDADES_SUBCLASSE,
  type HabilidadeBaseDto,
} from './habilidades-catalogo.dados';

/**
 * Prova as regras de visibilidade do seletor de habilidades do sistema (`sistema-v4.1.0.md` —
 * "Habilidades"): Gerais sempre; Classe entre as três classes-base; Arquétipo só os da classe da
 * ficha (o Experimento entra como subclasse), com as Gerais Melhoradas apenas do próprio arquétipo.
 */
describe('catálogo de habilidades → grupos de filtro', () => {
  const grupo = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): GrupoHabilidades =>
    grupos.find((g) => g.id === id)!;
  const chaves = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): (string | null)[] =>
    grupo(grupos, id).subgrupos.map((s) => s.chave);
  const daFicha = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): SubgrupoHabilidades =>
    grupo(grupos, id).subgrupos.find((s) => s.ehDaFicha)!;

  it('Gerais: sempre um subgrupo único com todas as gerais (categoria GERAL, sem origem)', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    const gerais = grupo(grupos, 'gerais');
    expect(gerais.subgrupos).toHaveLength(1);
    expect(gerais.subgrupos[0].chave).toBeNull();
    expect(gerais.subgrupos[0].habilidades).toHaveLength(HABILIDADES_GERAIS.length);
    expect(gerais.subgrupos[0].habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.GERAL)).toBe(true);
    expect(gerais.subgrupos[0].habilidades.every((h) => h.origem === undefined)).toBe(true);
  });

  it('Classe: as três classes-base, a da ficha primeiro e marcada; itens têm origem = a classe', () => {
    const grupos = catalogoHabilidades(ClasseEnum.ESPECIALISTA, ArquetipoEnum.ASSASSINO);
    expect(chaves(grupos, 'classe')).toEqual([
      ClasseEnum.ESPECIALISTA,
      ClasseEnum.COMBATENTE,
      ClasseEnum.SUPORTE,
    ]);
    const propria = daFicha(grupos, 'classe');
    expect(propria.chave).toBe(ClasseEnum.ESPECIALISTA);
    expect(propria.habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.CLASSE)).toBe(true);
    expect(propria.habilidades.every((h) => h.origem === ClasseEnum.ESPECIALISTA)).toBe(true);
  });

  it('Arquétipo: só os da classe da ficha (nunca de outra classe); o da ficha primeiro', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    expect(chaves(grupos, 'arquetipo')).toEqual([
      ArquetipoEnum.LUTADOR,
      ArquetipoEnum.MERCENARIO,
      ArquetipoEnum.VANGUARDA,
    ]);
    // Nenhum arquétipo de Especialista/Suporte vaza.
    expect(chaves(grupos, 'arquetipo')).not.toContain(ArquetipoEnum.ENGENHEIRO);
    expect(chaves(grupos, 'arquetipo')).not.toContain(ArquetipoEnum.PARAMEDICO);
  });

  it('Gerais Melhoradas entram só no subgrupo do arquétipo da ficha', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    const arquetipo = grupo(grupos, 'arquetipo');
    const lutador = arquetipo.subgrupos.find((s) => s.chave === ArquetipoEnum.LUTADOR)!;
    const mercenario = arquetipo.subgrupos.find((s) => s.chave === ArquetipoEnum.MERCENARIO)!;
    // O Lutador (da ficha) tem melhoradas; o Mercenário (outro) não.
    expect(lutador.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA)).toBe(true);
    expect(mercenario.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA)).toBe(false);
    // As melhoradas do Lutador carregam origem = LUTADOR.
    const melhoradas = lutador.habilidades.filter((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA);
    expect(melhoradas.every((h) => h.origem === ArquetipoEnum.LUTADOR)).toBe(true);
  });

  it('Habilidade Inicial (1º item) só aparece no arquétipo da ficha; nos outros ela some da lista', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    const arquetipo = grupo(grupos, 'arquetipo');
    const lutador = arquetipo.subgrupos.find((s) => s.chave === ArquetipoEnum.LUTADOR)!;
    const mercenario = arquetipo.subgrupos.find((s) => s.chave === ArquetipoEnum.MERCENARIO)!;

    const inicialLutador = HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][0].nome;
    const inicialMercenario = HABILIDADES_ARQUETIPO[ArquetipoEnum.MERCENARIO][0].nome;

    // A do próprio arquétipo mantém a inicial; a de outro arquétipo não a lista.
    expect(lutador.habilidades.some((h) => h.nome === inicialLutador)).toBe(true);
    expect(mercenario.habilidades.some((h) => h.nome === inicialMercenario)).toBe(false);
    // O resto das habilidades do Mercenário continua disponível (só a inicial some).
    expect(mercenario.habilidades).toHaveLength(HABILIDADES_ARQUETIPO[ArquetipoEnum.MERCENARIO].length - 1);
    expect(mercenario.habilidades.some((h) => h.nome === HABILIDADES_ARQUETIPO[ArquetipoEnum.MERCENARIO][1].nome)).toBe(true);
  });

  it('sem arquétipo selecionado: nenhum arquétipo é da ficha, então nenhuma inicial aparece', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, null);
    const arquetipo = grupo(grupos, 'arquetipo');
    for (const arq of [ArquetipoEnum.LUTADOR, ArquetipoEnum.MERCENARIO, ArquetipoEnum.VANGUARDA]) {
      const sub = arquetipo.subgrupos.find((s) => s.chave === arq)!;
      const inicial = HABILIDADES_ARQUETIPO[arq][0].nome;
      expect(sub.habilidades.some((h) => h.nome === inicial)).toBe(false);
    }
  });

  it('Experimento: Classe traz a classe-base marcada; Arquétipo traz a subclasse + arquétipos da base, sem outras subclasses e sem melhoradas', () => {
    const grupos = catalogoHabilidades(ClasseEnum.EXPERIMENTO_BESTIAL, null);

    // Classe: a base (Combatente) é a da ficha.
    expect(daFicha(grupos, 'classe').chave).toBe(ClasseEnum.COMBATENTE);

    // Arquétipo: subclasse Bestial primeiro (da ficha) + arquétipos de Combatente.
    const chavesArquetipo = chaves(grupos, 'arquetipo');
    expect(chavesArquetipo[0]).toBe(ClasseEnum.EXPERIMENTO_BESTIAL);
    expect(chavesArquetipo).toContain(ArquetipoEnum.LUTADOR);
    // Nenhuma outra subclasse aparece.
    expect(chavesArquetipo).not.toContain(ClasseEnum.EXPERIMENTO_ARTIFICIAL);
    expect(chavesArquetipo).not.toContain(ClasseEnum.EXPERIMENTO_HIBRIDO);

    // A subclasse tem categoria SUBCLASSE e origem = a subclasse; sem melhoradas em lugar nenhum.
    const subclasse = grupo(grupos, 'arquetipo').subgrupos[0];
    expect(subclasse.habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.SUBCLASSE)).toBe(true);
    expect(subclasse.habilidades.every((h) => h.origem === ClasseEnum.EXPERIMENTO_BESTIAL)).toBe(true);
    const temMelhorada = grupo(grupos, 'arquetipo').subgrupos.some((s) =>
      s.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA),
    );
    expect(temMelhorada).toBe(false);
  });

  it('Civil: só o grupo Gerais (sem Classe nem Arquétipo)', () => {
    const grupos = catalogoHabilidades(ClasseEnum.CIVIL, null);
    expect(grupos.map((g) => g.id)).toEqual(['gerais']);
  });

  it('classe-base sem arquétipo selecionado: mostra os arquétipos da classe, nenhum marcado, sem melhoradas', () => {
    const grupos = catalogoHabilidades(ClasseEnum.SUPORTE, null);
    const arquetipo = grupo(grupos, 'arquetipo');
    expect(arquetipo.subgrupos.map((s) => s.chave)).toEqual([
      ArquetipoEnum.PARAMEDICO,
      ArquetipoEnum.DIPLOMATA,
      ArquetipoEnum.COMANDANTE,
    ]);
    expect(arquetipo.subgrupos.some((s) => s.ehDaFicha)).toBe(false);
    const temMelhorada = arquetipo.subgrupos.some((s) =>
      s.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA),
    );
    expect(temMelhorada).toBe(false);
  });
});

/**
 * Prova a Habilidade Inicial que o agente já ganha do arquétipo/subclasse (`sistema-v4.1.0.md` —
 * "Habilidade Inicial de Arquétipo"): é sempre o primeiro item da lista, com categoria/origem.
 */
describe('habilidadesIniciais', () => {
  it('arquétipo: a primeira habilidade do arquétipo, categoria ARQUETIPO e origem = o arquétipo', () => {
    const iniciais = habilidadesIniciais(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    expect(iniciais).toHaveLength(1);
    expect(iniciais[0].nome).toBe(HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][0].nome);
    expect(iniciais[0].categoria).toBe(HabilidadeCategoriaEnum.ARQUETIPO);
    expect(iniciais[0].origem).toBe(ArquetipoEnum.LUTADOR);
  });

  it('subclasse Experimento: a primeira de subclasse (arquetipo null), categoria SUBCLASSE e origem = a classe', () => {
    const iniciais = habilidadesIniciais(ClasseEnum.EXPERIMENTO_BESTIAL, null);
    expect(iniciais).toHaveLength(1);
    expect(iniciais[0].nome).toBe(HABILIDADES_SUBCLASSE[ClasseEnum.EXPERIMENTO_BESTIAL]![0].nome);
    expect(iniciais[0].categoria).toBe(HabilidadeCategoriaEnum.SUBCLASSE);
    expect(iniciais[0].origem).toBe(ClasseEnum.EXPERIMENTO_BESTIAL);
  });

  it('classe-base sem arquétipo, e Civil: nenhuma inicial', () => {
    expect(habilidadesIniciais(ClasseEnum.COMBATENTE, null)).toEqual([]);
    expect(habilidadesIniciais(ClasseEnum.CIVIL, null)).toEqual([]);
  });
});

/**
 * `ehHabilidadeInicial` identifica a inicial (1º item do arquétipo/subclasse) por origem + nome — a
 * mesma que `habilidadesIniciais` concede; usada só para rotular/realçar a inicial na UI.
 */
describe('ehHabilidadeInicial', () => {
  it('reconhece a inicial de um arquétipo (1º item) pela dupla origem + nome', () => {
    const inicial = HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][0].nome;
    expect(ehHabilidadeInicial(ArquetipoEnum.LUTADOR, inicial)).toBe(true);
    // 2º item do mesmo arquétipo não é inicial.
    expect(ehHabilidadeInicial(ArquetipoEnum.LUTADOR, HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][1].nome)).toBe(false);
  });

  it('reconhece a inicial de uma subclasse Experimento (origem = a classe)', () => {
    const inicial = HABILIDADES_SUBCLASSE[ClasseEnum.EXPERIMENTO_BESTIAL]![0].nome;
    expect(ehHabilidadeInicial(ClasseEnum.EXPERIMENTO_BESTIAL, inicial)).toBe(true);
  });

  it('nome certo mas origem de outro arquétipo → não é a inicial daquele', () => {
    const inicialLutador = HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][0].nome;
    expect(ehHabilidadeInicial(ArquetipoEnum.MERCENARIO, inicialLutador)).toBe(false);
  });

  it('origem ausente (Geral/Personalidade) nunca é inicial', () => {
    expect(ehHabilidadeInicial(undefined, HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR][0].nome)).toBe(false);
  });
});

describe('efeitos estruturados no catálogo (m3-20)', () => {
  /** Todas as habilidades do catálogo (todas as coleções), achatadas para busca por nome. */
  const todas: readonly HabilidadeBaseDto[] = [
    ...HABILIDADES_GERAIS,
    ...Object.values(HABILIDADES_CLASSE).flat(),
    ...Object.values(HABILIDADES_ARQUETIPO).flat(),
    ...Object.values(HABILIDADES_GERAIS_MELHORADAS).flat(),
    ...Object.values(HABILIDADES_SUBCLASSE).flat(),
  ];
  const efeitosDe = (nome: string, colecao: readonly HabilidadeBaseDto[] = todas): readonly RolagemEfeitoDto[] | undefined =>
    colecao.find((habilidade) => habilidade.nome === nome)?.efeitos;

  it('Força Bruta carrega o efeito FOR × 3 físico', () => {
    const forcaBruta = Object.values(HABILIDADES_ARQUETIPO)
      .flat()
      .find((habilidade) => habilidade.nome === 'Força Bruta');
    expect(forcaBruta?.efeitos).toEqual([
      {
        tipo: RolagemEfeitoTipoEnum.DANO_ATRIBUTO,
        atributo: 'forca',
        multiplicador: 3,
        tipoDano: TipoDanoEnum.FISICO,
        alvo: RolagemEfeitoAlvoEnum.DANO,
      },
    ]);
  });

  it('Pistoleiro soma DES × 3 no dano, tipo Balístico (ataque à distância)', () => {
    expect(efeitosDe('Pistoleiro', HABILIDADES_ARQUETIPO[ArquetipoEnum.MERCENARIO])).toEqual([
      {
        tipo: RolagemEfeitoTipoEnum.DANO_ATRIBUTO,
        atributo: 'destreza',
        multiplicador: 3,
        tipoDano: TipoDanoEnum.BALISTICO,
        alvo: RolagemEfeitoAlvoEnum.DANO,
      },
    ]);
  });

  it('Golpe Pesado soma VIG × 1 no dano físico', () => {
    expect(efeitosDe('Golpe Pesado', HABILIDADES_ARQUETIPO[ArquetipoEnum.VANGUARDA])).toEqual([
      {
        tipo: RolagemEfeitoTipoEnum.DANO_ATRIBUTO,
        atributo: 'vigor',
        multiplicador: 1,
        tipoDano: TipoDanoEnum.FISICO,
        alvo: RolagemEfeitoAlvoEnum.DANO,
      },
    ]);
  });

  it('Eclético dá vantagem no teste (+1 dado)', () => {
    expect(efeitosDe('Eclético', HABILIDADES_CLASSE[ClasseEnum.ESPECIALISTA])).toEqual([
      { tipo: RolagemEfeitoTipoEnum.BONUS_TESTE, variante: 'DADO', valor: 1, alvo: RolagemEfeitoAlvoEnum.TESTE },
    ]);
  });

  it('Prodígio Forense dá bônus fixo no teste (+5)', () => {
    expect(efeitosDe('Prodígio Forense', HABILIDADES_CLASSE[ClasseEnum.ESPECIALISTA])).toEqual([
      { tipo: RolagemEfeitoTipoEnum.BONUS_TESTE, variante: 'FIXO', valor: 5, alvo: RolagemEfeitoAlvoEnum.TESTE },
    ]);
  });

  it('Especialista em Explosivos eleva os dados de dano em 1 tipo', () => {
    expect(efeitosDe('Especialista em Explosivos', HABILIDADES_GERAIS)).toEqual([
      { tipo: RolagemEfeitoTipoEnum.ELEVAR_DADO, valor: 1, alvo: RolagemEfeitoAlvoEnum.DANO },
    ]);
  });

  it('Atirador Calculista soma a Pontaria ao teste (BONUS_TESTE variante ATRIBUTO)', () => {
    expect(efeitosDe('Atirador Calculista', HABILIDADES_GERAIS)).toEqual([
      {
        tipo: RolagemEfeitoTipoEnum.BONUS_TESTE,
        variante: 'ATRIBUTO',
        atributo: 'pontaria',
        multiplicador: 1,
        alvo: RolagemEfeitoAlvoEnum.TESTE,
      },
    ]);
  });

  it('Queima-Roupa adiciona 2 dados de dano da arma (DANO_DADOS_ARMA)', () => {
    expect(efeitosDe('Queima-Roupa', HABILIDADES_GERAIS)).toEqual([
      { tipo: RolagemEfeitoTipoEnum.DANO_DADOS_ARMA, valor: 2, alvo: RolagemEfeitoAlvoEnum.DANO },
    ]);
  });

  it('Reforço Adrenalizado compõe bônus de teste (FIXO) + dado de dano da arma (roteados por papel)', () => {
    expect(efeitosDe('Reforço Adrenalizado', HABILIDADES_ARQUETIPO[ArquetipoEnum.LUTADOR])).toEqual([
      { tipo: RolagemEfeitoTipoEnum.BONUS_TESTE, variante: 'FIXO', valor: 3, alvo: RolagemEfeitoAlvoEnum.TESTE },
      { tipo: RolagemEfeitoTipoEnum.DANO_DADOS_ARMA, valor: 1, alvo: RolagemEfeitoAlvoEnum.DANO },
    ]);
  });

  it('Gerais Melhoradas compõem dado + fixo (Charlatão do Diplomata: +2 dados e +2 no resultado)', () => {
    expect(efeitosDe('Charlatão', HABILIDADES_GERAIS_MELHORADAS[ArquetipoEnum.DIPLOMATA])).toEqual([
      { tipo: RolagemEfeitoTipoEnum.BONUS_TESTE, variante: 'DADO', valor: 2, alvo: RolagemEfeitoAlvoEnum.TESTE },
      { tipo: RolagemEfeitoTipoEnum.BONUS_TESTE, variante: 'FIXO', valor: 2, alvo: RolagemEfeitoAlvoEnum.TESTE },
    ]);
  });

  it('todos os efeitos do catálogo são bem-formados (tipo + alvo, e campos coerentes por tipo)', () => {
    const comEfeito = todas.filter((habilidade) => habilidade.efeitos);
    expect(comEfeito.length).toBeGreaterThan(20); // sanidade: o pass estruturou um lote de habilidades
    for (const habilidade of comEfeito) {
      for (const efeito of habilidade.efeitos!) {
        expect(Object.values(RolagemEfeitoTipoEnum)).toContain(efeito.tipo);
        expect(Object.values(RolagemEfeitoAlvoEnum)).toContain(efeito.alvo);
        if (efeito.tipo === RolagemEfeitoTipoEnum.BONUS_TESTE) {
          expect(efeito.alvo).toBe(RolagemEfeitoAlvoEnum.TESTE);
          expect(['DADO', 'FIXO', 'ATRIBUTO']).toContain(efeito.variante);
          if (efeito.variante === 'ATRIBUTO') {
            expect(efeito.atributo).toBeTruthy();
            expect(efeito.multiplicador).toBeGreaterThan(0);
          } else {
            expect(efeito.valor).toBeGreaterThan(0);
          }
        }
        if (efeito.tipo === RolagemEfeitoTipoEnum.DANO_DADOS_ARMA) {
          expect(efeito.alvo).toBe(RolagemEfeitoAlvoEnum.DANO);
          expect(efeito.valor).toBeGreaterThan(0);
        }
        if (efeito.tipo === RolagemEfeitoTipoEnum.DANO_ATRIBUTO) {
          expect(efeito.alvo).toBe(RolagemEfeitoAlvoEnum.DANO);
          expect(efeito.atributo).toBeTruthy();
          expect(efeito.multiplicador).toBeGreaterThan(0);
        }
      }
    }
  });
});
