import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '@contratados-rpg/shared/enums';
import type { GrupoHabilidades, HabilidadeCatalogoItemDto } from '@contratados-rpg/shared/regras/agente';

import { FichaHabilidadeSeletor } from './ficha-habilidade-seletor.component';

function habilidade(nome: string, categoria: HabilidadeCategoriaEnum): HabilidadeCatalogoItemDto {
  return { nome, custoEnergia: 0, descricao: `Descrição de ${nome}`, categoria };
}

const GRUPOS_CLASSE_ARQUETIPO: readonly GrupoHabilidades[] = [
  {
    id: 'classe',
    subgrupos: [
      {
        chave: ClasseEnum.COMBATENTE,
        ehDaFicha: true,
        habilidades: [habilidade('Golpe Certeiro', HabilidadeCategoriaEnum.CLASSE)],
      },
    ],
  },
  {
    id: 'arquetipo',
    subgrupos: [
      {
        chave: ArquetipoEnum.LUTADOR,
        ehDaFicha: true,
        habilidades: [
          habilidade('Fúria de Combate', HabilidadeCategoriaEnum.ARQUETIPO),
          habilidade('Investida', HabilidadeCategoriaEnum.ARQUETIPO),
        ],
      },
    ],
  },
];

/** Mesmo conteúdo de `GRUPOS_CLASSE_ARQUETIPO`, mas em novos arrays — simula o que `gruposVagaAberta`
 *  produz ao reexecutar após `adicionarMelhoria`/`removerMelhoria` sem os grupos disponíveis mudarem. */
function gruposClonados(): readonly GrupoHabilidades[] {
  return GRUPOS_CLASSE_ARQUETIPO.map((grupo) => ({
    ...grupo,
    subgrupos: grupo.subgrupos.map((subgrupo) => ({ ...subgrupo, habilidades: [...subgrupo.habilidades] })),
  }));
}

const GRUPOS_SO_GERAL: readonly GrupoHabilidades[] = [
  {
    id: 'gerais',
    subgrupos: [
      { chave: null, ehDaFicha: true, habilidades: [habilidade('6º Sentido', HabilidadeCategoriaEnum.GERAL)] },
    ],
  },
];

function montar(grupos: readonly GrupoHabilidades[] = GRUPOS_CLASSE_ARQUETIPO) {
  TestBed.configureTestingModule({ imports: [FichaHabilidadeSeletor] });
  const fixture = TestBed.createComponent(FichaHabilidadeSeletor);
  fixture.componentRef.setInput('grupos', grupos);
  fixture.detectChanges();
  return fixture;
}

describe('FichaHabilidadeSeletor — aba ativa não reseta ao adicionar/remover (m3-73)', () => {
  it('permanece na aba Arquétipo ao adicionar duas habilidades seguidas', () => {
    const fixture = montar();
    const componente = fixture.componentInstance;

    componente['selecionarAba']('arquetipo');
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('arquetipo');

    // Simula `adicionarMelhoria`: o pai recalcula `grupos` (nova referência, mesmo conteúdo).
    fixture.componentRef.setInput('grupos', gruposClonados());
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('arquetipo');

    fixture.componentRef.setInput('grupos', gruposClonados());
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('arquetipo');
  });

  it('remover uma habilidade já adicionada também não altera a aba ativa', () => {
    const fixture = montar();
    const componente = fixture.componentInstance;

    componente['selecionarAba']('arquetipo');
    fixture.detectChanges();

    fixture.componentRef.setInput('grupos', gruposClonados());
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('arquetipo');
  });

  it('reinicia para a primeira aba quando o conjunto de grupos muda de verdade (troca de vaga)', () => {
    const fixture = montar();
    const componente = fixture.componentInstance;

    componente['selecionarAba']('arquetipo');
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('arquetipo');

    fixture.componentRef.setInput('grupos', GRUPOS_SO_GERAL);
    fixture.detectChanges();
    expect(componente['abaAtiva']()).toBe('gerais');
  });

  it('mesma preservação vale para o subgrupo ativo (subfiltro)', () => {
    const fixture = montar();
    const componente = fixture.componentInstance;

    componente['selecionarAba']('arquetipo');
    fixture.detectChanges();
    expect(componente['subgrupoAtivo']()).toBe(ArquetipoEnum.LUTADOR);

    fixture.componentRef.setInput('grupos', gruposClonados());
    fixture.detectChanges();
    expect(componente['subgrupoAtivo']()).toBe(ArquetipoEnum.LUTADOR);
  });
});
