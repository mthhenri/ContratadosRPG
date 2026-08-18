import { TestBed } from '@angular/core/testing';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  NivelAmeacaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { CartaoCombatente } from './cartao-combatente.component';

/**
 * Prova o cartão de combatente da tela "Iniciativa" (m7-05). O que importa aqui é o recorte que a
 * **regra** impõe sobre o mockup: criatura sem Esquiva/Bloqueio/Contra, avulso sem defesa nenhuma,
 * e as três condições da ficha lidas (nunca deduzidas da Vida).
 */
describe('CartaoCombatente', () => {
  const base: EncontroCombatenteResumoDto = {
    id: 1,
    encontroId: 9,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: 40,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome: 'K. Amaral',
    iniciativa: 18,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaAtual: 31,
    vidaMaxima: 31,
    energiaAtual: 6,
    energiaMaxima: 16,
    defesa: 14,
    esquiva: 15,
    bloqueio: 6,
    contraAtaque: 9,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 4,
    iniciativaBonus: 0,
    corFicha: '#4a9d6b',
    revelado: true,
  };

  function montar(combatente: EncontroCombatenteResumoDto, entradas: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(CartaoCombatente);
    fixture.componentRef.setInput('combatente', combatente);
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
    return fixture;
  }

  const texto = (fixture: ReturnType<typeof montar>, seletor: string): string =>
    (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';

  /** Os itens da faixa de defesas, um por `<span>` (o texto concatenado não tem separador). */
  const defesas = (fixture: ReturnType<typeof montar>): string[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.combatente__defesas span'),
    ).map((item) => item.textContent?.trim() ?? '');

  it('desenha as quatro defesas do agente', () => {
    const fixture = montar(base);
    expect(defesas(fixture)).toEqual(['Defesa 14', 'Esquiva 15', 'Bloqueio 6', 'Contra 9']);
  });

  it('mostra só Defesa na criatura — ela não reage a ataques (a regra vence o mockup)', () => {
    const fixture = montar(
      {
        ...base,
        tipoFicha: TipoFichaEnum.CRIATURA,
        nome: 'SCP-1471-A',
        defesa: 17,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
        energiaAtual: null,
        energiaMaxima: null,
        morrendo: null,
        machucado: null,
        inconsciente: null,
      },
      { nivelAmeaca: NivelAmeacaEnum.ALTA, emCombate: true },
    );
    expect(defesas(fixture)).toEqual(['Defesa 17']);
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Ameaça · Alta');
  });

  it('não desenha faixa de defesas nem Energia para o avulso', () => {
    const fixture = montar({
      ...base,
      origem: CombatenteOrigemEnum.AVULSO,
      fichaId: null,
      tipoFicha: null,
      nome: 'Sgto. Duarte',
      defesa: null,
      esquiva: null,
      bloqueio: null,
      contraAtaque: null,
      energiaAtual: null,
      energiaMaxima: null,
      morrendo: null,
      machucado: null,
      inconsciente: null,
    });
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.combatente__defesas')).toBeNull();
    expect(elemento.querySelector('.combatente__recurso--energia')).toBeNull();
    expect(texto(fixture, '.combatente__origem')).toBe('Digitado nesta sessão');
  });

  it('só cita a Cadência quando ela de fato multiplica os turnos', () => {
    const singular = montar(base, { donoNome: 'Bia' });
    expect(texto(singular, '.combatente__origem')).toBe('Bia · Agente');

    const dupla = montar(
      { ...base, tipoFicha: TipoFichaEnum.CRIATURA, cadencia: CadenciaEnum.DUPLA },
      {},
    );
    expect(texto(dupla, '.combatente__origem')).toBe('Criatura da campanha · Cadência 2');
  });

  it('dá precedência a "Morrendo" sobre a vez, e some com a etiqueta de turno fora do combate', () => {
    const morrendo = montar({ ...base, morrendo: true }, { ehTurnoAtual: true, emCombate: true });
    expect(texto(morrendo, '.combatente__etiqueta')).toBe('Morrendo');

    const agindo = montar(base, { ehTurnoAtual: true, emCombate: true });
    expect(texto(agindo, '.combatente__etiqueta')).toBe('Age agora');

    const agiu = montar(base, { jaAgiu: true, emCombate: true });
    expect(texto(agiu, '.combatente__etiqueta')).toBe('Já agiu');

    // Encerrado/montagem: não há "vez", então o cartão cai na natureza.
    const foraDeCombate = montar(base, { jaAgiu: true, emCombate: false });
    expect(texto(foraDeCombate, '.combatente__etiqueta')).toBe('Agente');
  });

  it('lê as condições narrativas da ficha em vez de deduzi-las da Vida', () => {
    // Vida cheia + `machucado` marcado à mão: o cartão obedece a flag, não o número (m3-10).
    const fixture = montar({ ...base, vidaAtual: 31, machucado: true, inconsciente: true });
    expect(texto(fixture, '.combatente__narrativo')).toBe('Inconsciente · perde o turno · Machucado');
  });

  it('só oferece os steppers quando o ajuste está liberado', () => {
    const semAjuste = montar(base);
    expect((semAjuste.nativeElement as HTMLElement).querySelectorAll('.combatente__stepper').length)
      .toBe(0);

    const comAjuste = montar(base, { podeAjustar: true });
    // Vida (−/+) e Energia (−/+).
    expect((comAjuste.nativeElement as HTMLElement).querySelectorAll('.combatente__stepper').length)
      .toBe(4);
  });

  it('só expõe o campo de iniciativa e o remover no modo de edição explícito', () => {
    const normal = montar(base);
    const elementoNormal = normal.nativeElement as HTMLElement;
    expect(elementoNormal.querySelector('.combatente__iniciativa-campo')).toBeNull();
    expect(elementoNormal.querySelector('.combatente__remover')).toBeNull();

    const edicao = montar(base, { emEdicao: true });
    const elementoEdicao = edicao.nativeElement as HTMLElement;
    expect(elementoEdicao.querySelector('.combatente__iniciativa-campo')).not.toBeNull();
    expect(elementoEdicao.querySelector('.combatente__remover')).not.toBeNull();
  });

  it('não desenha número nenhum do combatente não revelado (m7-06)', () => {
    // É assim que o backend responde ao jogador: identidade da ordem de turno, tudo mais zerado.
    const fixture = montar(
      {
        ...base,
        tipoFicha: TipoFichaEnum.CRIATURA,
        nome: 'SCP-1471-A',
        iniciativa: 21,
        cadencia: CadenciaEnum.DUPLA,
        vidaAtual: 0,
        vidaMaxima: 0,
        energiaAtual: null,
        energiaMaxima: null,
        defesa: null,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
        condicoes: [],
        morrendo: null,
        machucado: null,
        inconsciente: null,
        destreza: 0,
        revelado: false,
      },
      { emCombate: true, nivelAmeaca: NivelAmeacaEnum.ALTA },
    );
    const elemento = fixture.nativeElement as HTMLElement;

    // A Vida vira um traço — "0/0" pareceria uma criatura morta, não uma desconhecida.
    expect(texto(fixture, '.combatente__recurso--oculto')).toBe('Vida —');
    expect(elemento.querySelector('.combatente__recurso--vida')).toBeNull();
    expect(elemento.querySelector('.combatente__defesas')).toBeNull();
    // Nem o Nível de Ameaça vaza: dizer "Ameaça · Alta" já entregaria metade do segredo.
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Não revelado');
    // A Cadência fica — quem age duas vezes na rodada age na frente de todo mundo.
    expect(texto(fixture, '.combatente__origem')).toBe('Em campo · Cadência 2');
    expect(texto(fixture, '.combatente__iniciativa-valor')).toBe('21');
  });

  it('o agente de outro jogador, não revelado, também não se anuncia', () => {
    const fixture = montar(
      { ...base, nome: 'V. Corvalho', revelado: false, vidaAtual: 0, vidaMaxima: 0, energiaMaxima: null, energiaAtual: null, defesa: null, esquiva: null, bloqueio: null, contraAtaque: null },
      { emCombate: true },
    );
    // Antes da correção o cartão caía no ramo do agente e estampava 'Aguarda' — um estado de
    // combate de uma ficha que este jogador nem pode abrir.
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Não revelado');
    expect(texto(fixture, '.combatente__origem')).toBe('Em campo');
  });

  it('emite a iniciativa digitada e ignora o campo vazio', () => {
    const fixture = montar(base, { emEdicao: true });
    const emitidos: number[] = [];
    fixture.componentInstance.iniciativaAtribuida.subscribe((valor) => emitidos.push(valor));

    const campo = (fixture.nativeElement as HTMLElement).querySelector(
      '.combatente__iniciativa-campo',
    ) as HTMLInputElement;

    campo.value = '21';
    campo.dispatchEvent(new Event('change'));
    campo.value = '   ';
    campo.dispatchEvent(new Event('change'));

    expect(emitidos).toEqual([21]);
  });
});
