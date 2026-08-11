import { describe, expect, it } from 'vitest';

import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';
import {
  catalogoHabilidades,
  ehHabilidadeInicial,
  habilidadesIniciais,
  subclasseExperimentoDaClasseBase,
  type GrupoHabilidades,
  type SubgrupoHabilidades,
} from './habilidades-catalogo';
import {
  HABILIDADES_ARQUETIPO,
  HABILIDADES_CIVIL,
  HABILIDADES_GERAIS,
  HABILIDADES_GERAIS_MELHORADAS,
  HABILIDADES_SUBCLASSE,
} from './habilidades-catalogo.dados';

/**
 * Prova as regras de visibilidade do seletor de habilidades do sistema (`sistema-v4.1.0.md` —
 * "Habilidades"): Gerais sempre (com as melhoradas do arquétipo da ficha substituindo a comum);
 * Classe entre as três classes-base; Subclasse só existe pra Experimento (aba separada de
 * Arquétipo — P-014 follow-up); Arquétipo só os da classe-base da ficha, sem nenhuma Geral
 * Melhorada (elas vivem só na aba Gerais).
 */
describe('catálogo de habilidades → grupos de filtro', () => {
  const grupo = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): GrupoHabilidades =>
    grupos.find((g) => g.id === id)!;
  const chaves = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): (string | null)[] =>
    grupo(grupos, id).subgrupos.map((s) => s.chave);
  const daFicha = (grupos: GrupoHabilidades[], id: GrupoHabilidades['id']): SubgrupoHabilidades =>
    grupo(grupos, id).subgrupos.find((s) => s.ehDaFicha)!;

  it('Gerais: sempre um subgrupo único com todas as gerais (categoria GERAL, sem origem) quando a ficha não tem arquétipo', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, null);
    const gerais = grupo(grupos, 'gerais');
    expect(gerais.subgrupos).toHaveLength(1);
    expect(gerais.subgrupos[0].chave).toBeNull();
    expect(gerais.subgrupos[0].habilidades).toHaveLength(HABILIDADES_GERAIS.length);
    expect(gerais.subgrupos[0].habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.GERAL)).toBe(true);
    expect(gerais.subgrupos[0].habilidades.every((h) => h.origem === undefined)).toBe(true);
  });

  it('Gerais: a melhorada do arquétipo da ficha substitui a comum na mesma lista (mesma contagem, mesmo nome)', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    const habilidades = grupo(grupos, 'gerais').subgrupos[0].habilidades;
    // A contagem não muda — a melhorada ocupa o lugar da comum, não soma.
    expect(habilidades).toHaveLength(HABILIDADES_GERAIS.length);

    const melhoradasLutador = HABILIDADES_GERAIS_MELHORADAS[ArquetipoEnum.LUTADOR];
    for (const melhorada of melhoradasLutador) {
      const ocorrencias = habilidades.filter((h) => h.nome === melhorada.nome);
      // Uma só entrada por nome — nunca a comum e a melhorada juntas.
      expect(ocorrencias).toHaveLength(1);
      expect(ocorrencias[0].categoria).toBe(HabilidadeCategoriaEnum.GERAL_MELHORADA);
      expect(ocorrencias[0].origem).toBe(ArquetipoEnum.LUTADOR);
      expect(ocorrencias[0].descricao).toBe(melhorada.descricao);
    }

    // Geral sem versão melhorada do Lutador continua normal (categoria GERAL, sem origem).
    const nomesMelhorados = new Set(melhoradasLutador.map((m) => m.nome));
    const semMelhoria = habilidades.find((h) => !nomesMelhorados.has(h.nome));
    expect(semMelhoria?.categoria).toBe(HabilidadeCategoriaEnum.GERAL);
    expect(semMelhoria?.origem).toBeUndefined();
  });

  it('Gerais: arquétipo diferente do dono da melhorada continua vendo a versão comum', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.MERCENARIO);
    const habilidades = grupo(grupos, 'gerais').subgrupos[0].habilidades;
    const melhoradasLutador = HABILIDADES_GERAIS_MELHORADAS[ArquetipoEnum.LUTADOR];
    for (const melhorada of melhoradasLutador) {
      const item = habilidades.find((h) => h.nome === melhorada.nome)!;
      expect(item.categoria).toBe(HabilidadeCategoriaEnum.GERAL);
      expect(item.origem).toBeUndefined();
    }
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

  it('Gerais Melhoradas nunca aparecem na aba Arquétipo — elas vivem só na aba Gerais', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    const arquetipo = grupo(grupos, 'arquetipo');
    expect(
      arquetipo.subgrupos.some((s) =>
        s.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA),
      ),
    ).toBe(false);
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

  it('Experimento: Classe traz a classe-base marcada; Subclasse traz a própria (aba separada); Arquétipo traz os da base, sem nenhum marcado', () => {
    const grupos = catalogoHabilidades(ClasseEnum.EXPERIMENTO_BESTIAL, null);

    // Classe: a base (Combatente) é a da ficha.
    expect(daFicha(grupos, 'classe').chave).toBe(ClasseEnum.COMBATENTE);

    // Subclasse: aba própria (P-014 follow-up), só a subclasse da ficha — sempre ehDaFicha.
    const subclasseGrupo = grupo(grupos, 'subclasse');
    expect(subclasseGrupo.subgrupos).toHaveLength(1);
    const subclasse = subclasseGrupo.subgrupos[0];
    expect(subclasse.chave).toBe(ClasseEnum.EXPERIMENTO_BESTIAL);
    expect(subclasse.ehDaFicha).toBe(true);
    expect(subclasse.habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.SUBCLASSE)).toBe(true);
    expect(subclasse.habilidades.every((h) => h.origem === ClasseEnum.EXPERIMENTO_BESTIAL)).toBe(true);

    // Arquétipo: só os arquétipos de Combatente (a base) — a subclasse não aparece aqui, e nenhuma outra subclasse aparece em lugar nenhum.
    const chavesArquetipo = chaves(grupos, 'arquetipo');
    expect(chavesArquetipo).toEqual([ArquetipoEnum.LUTADOR, ArquetipoEnum.MERCENARIO, ArquetipoEnum.VANGUARDA]);
    expect(chavesArquetipo).not.toContain(ClasseEnum.EXPERIMENTO_BESTIAL);
    expect(chavesArquetipo).not.toContain(ClasseEnum.EXPERIMENTO_ARTIFICIAL);
    expect(chavesArquetipo).not.toContain(ClasseEnum.EXPERIMENTO_HIBRIDO);
    // Nenhum arquétipo é "da ficha" — a dela é a Subclasse, numa aba diferente.
    expect(grupo(grupos, 'arquetipo').subgrupos.some((s) => s.ehDaFicha)).toBe(false);

    const temMelhorada = [...subclasseGrupo.subgrupos, ...grupo(grupos, 'arquetipo').subgrupos].some((s) =>
      s.habilidades.some((h) => h.categoria === HabilidadeCategoriaEnum.GERAL_MELHORADA),
    );
    expect(temMelhorada).toBe(false);
  });

  it('classe-base nunca tem a aba Subclasse (só existe pra Experimento)', () => {
    const grupos = catalogoHabilidades(ClasseEnum.COMBATENTE, ArquetipoEnum.LUTADOR);
    expect(grupos.map((g) => g.id)).not.toContain('subclasse');
  });

  it('Civil: só o grupo Civil (sem Gerais/Classe/Arquétipo) — doc: "não possuem classes, arquétipos ou habilidades gerais"', () => {
    const grupos = catalogoHabilidades(ClasseEnum.CIVIL, null);
    expect(grupos.map((g) => g.id)).toEqual(['civil']);
    const civil = grupo(grupos, 'civil');
    expect(civil.subgrupos).toHaveLength(1);
    expect(civil.subgrupos[0].chave).toBeNull();
    expect(civil.subgrupos[0].habilidades).toHaveLength(HABILIDADES_CIVIL.length);
    expect(civil.subgrupos[0].habilidades.every((h) => h.categoria === HabilidadeCategoriaEnum.CIVIL)).toBe(true);
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
 * `subclasseExperimentoDaClasseBase` — o inverso de `classeBaseDeHabilidades`, usado pela segunda
 * etapa do seletor de Classe em dois passos do guia de criação (P-019).
 */
describe('subclasseExperimentoDaClasseBase', () => {
  it('devolve a subclasse de Experimento de cada classe-base', () => {
    expect(subclasseExperimentoDaClasseBase(ClasseEnum.COMBATENTE)).toBe(ClasseEnum.EXPERIMENTO_BESTIAL);
    expect(subclasseExperimentoDaClasseBase(ClasseEnum.ESPECIALISTA)).toBe(ClasseEnum.EXPERIMENTO_ARTIFICIAL);
    expect(subclasseExperimentoDaClasseBase(ClasseEnum.SUPORTE)).toBe(ClasseEnum.EXPERIMENTO_HIBRIDO);
  });

  it('devolve null para Civil e para uma subclasse (ela mesma não tem subclasse)', () => {
    expect(subclasseExperimentoDaClasseBase(ClasseEnum.CIVIL)).toBeNull();
    expect(subclasseExperimentoDaClasseBase(ClasseEnum.EXPERIMENTO_BESTIAL)).toBeNull();
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
