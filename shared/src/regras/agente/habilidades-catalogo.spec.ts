import { describe, expect, it } from 'vitest';

import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import {
  catalogoHabilidades,
  habilidadesIniciais,
  type GrupoHabilidades,
  type SubgrupoHabilidades,
} from './habilidades-catalogo';
import {
  HABILIDADES_ARQUETIPO,
  HABILIDADES_GERAIS,
  HABILIDADES_SUBCLASSE,
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
