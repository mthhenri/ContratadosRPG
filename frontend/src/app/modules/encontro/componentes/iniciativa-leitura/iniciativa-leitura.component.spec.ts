import { TestBed } from '@angular/core/testing';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { IniciativaLeitura } from './iniciativa-leitura.component';

/**
 * Prova a composição de leitura do Encontro (m8-05): ordem/turno/rodada, cartões de combatente e
 * log da rodada aparecem, e — o que a spec exige provar, não só supor — nenhum controle de
 * condução (steppers de Vida/Energia, receber dano, remover, rolagem avulsa, edição de
 * iniciativa) existe no DOM renderizado, porque `podeAjustar`/`ehMestre`/`emEdicao` nunca são
 * passados a `CartaoCombatente` (ficam no `false` padrão do próprio primitivo).
 */
describe('IniciativaLeitura', () => {
  const combatente = (
    id: number,
    nome: string,
    extras: Partial<EncontroRecuperadoDto['combatentes'][number]> = {},
  ) => ({
    id,
    encontroId: 1,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: id * 100,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome,
    iniciativa: 10,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: id,
    vidaAtual: 10,
    vidaMaxima: 10,
    energiaAtual: 5,
    energiaMaxima: 5,
    defesa: 12,
    esquiva: 11,
    bloqueio: 6,
    contraAtaque: 7,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 3,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: null,
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
    ...extras,
  });

  const encontro: EncontroRecuperadoDto = {
    id: 1,
    campanhaId: 8,
    nome: 'Contenção no Setor 12',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 2,
    turnoIndice: 1,
    combatentes: [
      combatente(1, 'SCP-1471-A', {
        tipoFicha: TipoFichaEnum.CRIATURA,
        iniciativa: 24,
        revelado: false,
        vidaAtual: 0,
        vidaMaxima: 0,
        defesa: null,
      }),
      combatente(2, 'K. Amaral', { iniciativa: 18 }),
    ],
    ordemRodada: [
      { combatenteId: 1, ocorrencia: 1 },
      { combatenteId: 2, ocorrencia: 1 },
    ],
    eventos: [
      {
        id: 1,
        tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
        rodada: 2,
        turno: 1,
        texto: 'Rodada 2 iniciada',
        combatenteId: null,
        createdDate: new Date().toISOString(),
      },
    ],
  };

  function montar(encontroParaMontar: EncontroRecuperadoDto = encontro) {
    TestBed.configureTestingModule({ imports: [IniciativaLeitura] });
    const fixture = TestBed.createComponent(IniciativaLeitura);
    fixture.componentRef.setInput('encontro', encontroParaMontar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  it('mostra status, rodada e turno no cabeçalho', () => {
    const { raiz } = montar();
    expect(raiz.textContent).toContain('Em combate');
    expect(raiz.textContent).toContain('Rodada 2');
    expect(raiz.textContent).toContain('Turno 2/2');
  });

  it('renderiza um cartão por ocorrência da ordem — mesma derivação de painel-encontro.page.ts', () => {
    const { raiz } = montar();
    expect(raiz.querySelectorAll('app-cartao-combatente').length).toBe(2);
  });

  it('renderiza o log da rodada com os eventos que chegaram', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('app-log-encontro')).not.toBeNull();
    expect(raiz.textContent).toContain('Rodada 2 iniciada');
  });

  it('combatente não revelado mostra a etiqueta "Não revelado" — o componente só desenha o recorte que o backend já redigiu', () => {
    const { raiz } = montar();
    expect(raiz.textContent).toContain('SCP-1471-A');
    expect(raiz.textContent).toContain('Não revelado');
  });

  it('NÃO tem nenhum controle de condução: sem stepper de Vida/Energia, receber dano, remover ou rolagem avulsa', () => {
    const { raiz } = montar();
    expect(raiz.querySelectorAll('.combatente__stepper').length).toBe(0);
    expect(raiz.querySelector('.combatente__ajustar')).toBeNull();
    expect(raiz.querySelector('.combatente__receber-dano')).toBeNull();
    expect(raiz.querySelector('.combatente__remover')).toBeNull();
    expect(raiz.querySelector('.combatente__rolar-avulso')).toBeNull();
    expect(raiz.querySelector('input.combatente__iniciativa-campo')).toBeNull();
  });

  it('NÃO tem nenhum pedido de "rolar minha iniciativa" — a composição nunca lê membros/ficha própria', () => {
    const { raiz } = montar();
    expect(raiz.textContent).not.toContain('Rolar');
  });

  it('sem encontro ativo (montagem), mostra a ordem por iniciativa sem marcar "vez" nenhuma', () => {
    const { raiz } = montar({ ...encontro, status: EncontroStatusEnum.MONTAGEM, ordemRodada: [] });
    expect(raiz.querySelectorAll('app-cartao-combatente').length).toBe(2);
    expect(raiz.textContent).toContain('Montagem');
  });

  it('sem fichasCampanha (caso do Painel do espectador), a criatura revelada perde o nível — mostra só "Ameaça"', () => {
    const criaturaRevelada: EncontroRecuperadoDto = {
      ...encontro,
      combatentes: [
        combatente(3, 'Ameaça Beta', {
          tipoFicha: TipoFichaEnum.CRIATURA,
          origem: CombatenteOrigemEnum.FICHA,
          fichaId: 300,
          revelado: true,
        }),
      ],
      ordemRodada: [{ combatenteId: 3, ocorrencia: 1 }],
    };
    const { raiz } = montar(criaturaRevelada);
    expect(raiz.textContent).toContain('Ameaça');
    expect(raiz.textContent).not.toContain('Ameaça ·');
  });

  it('com fichasCampanha trazendo o na da criatura (caso da Prévia de jogador), mostra "Ameaça · <nível>"', () => {
    const criaturaRevelada: EncontroRecuperadoDto = {
      ...encontro,
      combatentes: [
        combatente(3, 'Ameaça Beta', {
          tipoFicha: TipoFichaEnum.CRIATURA,
          origem: CombatenteOrigemEnum.FICHA,
          fichaId: 300,
          revelado: true,
        }),
      ],
      ordemRodada: [{ combatenteId: 3, ocorrencia: 1 }],
    };
    TestBed.configureTestingModule({ imports: [IniciativaLeitura] });
    const fixture = TestBed.createComponent(IniciativaLeitura);
    fixture.componentRef.setInput('encontro', criaturaRevelada);
    fixture.componentRef.setInput('fichasCampanha', [{ id: 300, na: NivelAmeacaEnum.ALTA }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ameaça ·');
  });
});
