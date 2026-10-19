import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import {
  CadenciaEnum,
  ClasseEnum,
  ComportamentoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaCriaturaRecuperadaDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { FichaCampanhaCard } from '../ficha-campanha-card/ficha-campanha-card.component';
import { FichaService } from '../../ficha.service';
import { FichaEdicaoService } from '../../ficha-edicao.service';
import { FichaFlutuanteConteudo } from './ficha-flutuante-conteudo.component';

/**
 * Prova o corpo da janela flutuante: busca a ficha certa pro `tipo` do alvo, decide `ajustavel`
 * (mestre sempre; jogador só a própria) e desenha o componente certo (jogador × criatura).
 */
describe('FichaFlutuanteConteudo', () => {
  const fichaJogador = {
    id: 10,
    campanhaId: 1,
    usuarioId: 7,
    nome: 'K. Amaral',
    cor: '#4a9d6b',
    imagemUrl: null,
    imagemFoco: null,
    oculta: false,
    dados: {
      classe: ClasseEnum.COMBATENTE,
      nivel: 2,
      atributos: {
        destreza: 4, forca: 2, luta: 2, pontaria: 2, vigor: 2,
        intelecto: 2, medicina: 0, sentidos: 2, social: 0, vontade: 2,
      },
      estado: { vidaAtual: 20, energiaAtual: 10, lesoes: [] },
      inventario: { itens: [], amplificadores: [] },
      habilidades: [],
      rolagens: [],
      identidade: { personalidade: null, origem: null },
    },
  } as unknown as FichaRecuperadaDto;

  const fichaCriatura = {
    id: 20,
    campanhaId: 1,
    usuarioId: 1,
    nome: 'SCP-1471-A',
    cor: null,
    imagemUrl: null,
    imagemFoco: null,
    oculta: false,
    dados: {
      identidade: {
        origem: OrigemCriaturaEnum.ORIGINAL,
        conceito: 'x',
        naturezaFisica: 'x',
        comportamento: ComportamentoCriaturaEnum.CACADORA,
        motivacao: 'x',
        ganchoUnico: 'x',
      },
      na: NivelAmeacaEnum.ALTA,
      vd: 40,
      atributos: {
        destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8,
        intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4,
      },
      modificadores: {
        destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE,
        luta: ModificadorCriaturaEnum.FORTE, pontaria: ModificadorCriaturaEnum.FRAGIL,
        vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
        medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO,
        social: ModificadorCriaturaEnum.MEDIO, vontade: ModificadorCriaturaEnum.FRACO,
      },
      tenacidade: TenacidadeEnum.RESISTENTE,
      vidaMaxima: 100,
      vidaAtual: 100,
      defesa: 30,
      resistencias: [],
      fraquezas: [],
      porte: PorteCriaturaEnum.GRANDE,
      deslocamento: { terrestre: 9 },
      cadencia: CadenciaEnum.SINGULAR,
      ataques: [],
      habilidades: [],
      anotacoes: '',
    },
  } as unknown as FichaCriaturaRecuperadaDto;

  function montar(
    alvo: { fichaId: number; tipo: TipoFichaEnum; usuarioIdDono: number },
    ehMestre: boolean,
    usuarioLogadoId = 7,
  ) {
    const recuperarFicha = vi.fn(() => of(fichaJogador));
    const recuperarFichaCriatura = vi.fn(() => of(fichaCriatura));
    const reconexao$ = new Subject<void>();
    const tempoReal = {
      conectar: vi.fn(), entrarSalaFicha: vi.fn(), sairSalaFicha: vi.fn(),
      reconexao$: reconexao$.asObservable(),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FichaService,
          useValue: { recuperarFicha, recuperarFichaCriatura },
        },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioLogadoId }), autenticado: () => false } },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });

    const fixture = TestBed.createComponent(FichaFlutuanteConteudo);
    fixture.componentRef.setInput('alvo', alvo);
    fixture.componentRef.setInput('ehMestre', ehMestre);
    fixture.detectChanges();
    return { fixture, recuperarFicha, recuperarFichaCriatura, tempoReal, reconexao$ };
  }

  it('ocupa a sala `ficha:<id>` da ficha aberta enquanto vive (revogação chega mesmo sem o hospedeiro assinar)', () => {
    const { fixture, tempoReal } = montar({ fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 3 }, false);
    expect(tempoReal.entrarSalaFicha).toHaveBeenCalledWith(10);
    expect(tempoReal.sairSalaFicha).not.toHaveBeenCalled();

    fixture.destroy();

    expect(tempoReal.sairSalaFicha).toHaveBeenCalledWith(10);
  });

  it('reconexão negada limpa nome e documento da flutuante (P-130)', () => {
    const { fixture, recuperarFicha, reconexao$ } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 3 }, false,
    );
    recuperarFicha.mockReturnValue(throwError(() => ({ status: 403 })));
    reconexao$.next();
    fixture.detectChanges();
    expect(fixture.componentInstance.nome()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-ficha-campanha-card')).toBeNull();
  });

  it('falha transitória preserva documento e uma reconexão seguinte renova a ficha', () => {
    const { fixture, recuperarFicha, reconexao$ } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 }, false,
    );
    recuperarFicha.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    reconexao$.next();
    expect(fixture.componentInstance.nome()).toBe('K. Amaral');
    recuperarFicha.mockReturnValue(of({ ...fichaJogador, nome: 'Nome remoto' }));
    reconexao$.next();
    expect(fixture.componentInstance.nome()).toBe('Nome remoto');
  });

  it('concessão de criatura revogada durante queda também retira o documento', () => {
    const { fixture, recuperarFichaCriatura, reconexao$ } = montar(
      { fichaId: 20, tipo: TipoFichaEnum.CRIATURA, usuarioIdDono: 1 }, false,
    );
    recuperarFichaCriatura.mockReturnValue(throwError(() => ({ status: 404 })));
    reconexao$.next();
    fixture.detectChanges();
    expect(fixture.componentInstance.nome()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-criatura-visualizacao')).toBeNull();
  });

  it('ressincroniza sem descartar a edição local pendente do dono', () => {
    const { fixture, recuperarFicha, reconexao$ } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 }, false,
    );
    const edicao = fixture.debugElement.injector.get(FichaEdicaoService);
    fixture.componentInstance['fichaJogador'].set({ ...fichaJogador, nome: 'Edição local' });
    edicao.edicaoPendente.set(true);
    recuperarFicha.mockReturnValue(of({ ...fichaJogador, cor: '#22c55e' }));
    reconexao$.next();
    expect(fixture.componentInstance['fichaJogador']()?.nome).toBe('Edição local');
    expect(fixture.componentInstance['fichaJogador']()?.cor).toBe('#22c55e');
  });

  it('busca `recuperarFicha` e desenha `app-ficha-campanha-card` pro alvo JOGADOR', () => {
    const { fixture, recuperarFicha, recuperarFichaCriatura } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 },
      false,
    );
    expect(recuperarFicha).toHaveBeenCalledWith(10);
    expect(recuperarFichaCriatura).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-ficha-campanha-card'),
    ).not.toBeNull();
  });

  it('marca a ficha da janela flutuante para delegar a rolagem vertical à janela', () => {
    const { fixture } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 },
      false,
    );

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.ficha-visao--rolagem-externa'),
    ).not.toBeNull();
  });

  it('busca `recuperarFichaCriatura` e desenha `app-criatura-visualizacao` pro alvo CRIATURA', () => {
    const { fixture, recuperarFicha, recuperarFichaCriatura } = montar(
      { fichaId: 20, tipo: TipoFichaEnum.CRIATURA, usuarioIdDono: 1 },
      true,
    );
    expect(recuperarFichaCriatura).toHaveBeenCalledWith(20);
    expect(recuperarFicha).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-criatura-visualizacao'),
    ).not.toBeNull();
  });

  it('o mestre sempre pode ajustar, mesmo numa ficha que não é dele', () => {
    const doMestre = montar({ fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 }, true, 1);
    expect(
      (doMestre.fixture.componentInstance as unknown as { ajustavel: () => boolean }).ajustavel(),
    ).toBe(true);
  });

  it('o jogador pode ajustar a própria ficha', () => {
    const donoDaFicha = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 },
      false,
      7,
    );
    expect(
      (donoDaFicha.fixture.componentInstance as unknown as { ajustavel: () => boolean }).ajustavel(),
    ).toBe(true);
  });

  it('o jogador não pode ajustar a ficha de outro jogador', () => {
    const outroJogador = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 },
      false,
      99,
    );
    expect(
      (outroJogador.fixture.componentInstance as unknown as { ajustavel: () => boolean }).ajustavel(),
    ).toBe(false);
  });

  it('não libera rolagens quando um jogador abre a ficha de outra pessoa', () => {
    const { fixture } = montar(
      { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 },
      false,
      99,
    );
    const ficha = fixture.debugElement.query(By.directive(FichaCampanhaCard))
      .componentInstance as FichaCampanhaCard;

    expect(ficha.podeRolar()).toBe(false);
  });
});
