import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAcessoResumoDto,
  FichaAcessoRevogadoDto,
  FichaCriaturaAlteradaDto,
  FichaCriaturaDadosDto,
  FichaCriaturaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { CriaturaVisualizar } from './visualizar-criatura.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RolagemService } from '../../rolagem.service';

/**
 * Prova a página que junta rota/WS/acesso/exclusão em torno de `CriaturaVisualizacao` (m4-04b) —
 * mesmo contrato de `FichaVisualizar` (m3-07), mas para o documento de criatura: sem abas, sem a
 * ramificação `campanhaId` opcional (a rota de criatura sempre está sob `/painel/:campanhaId/...`).
 */
describe('CriaturaVisualizar', () => {
  const dados: FichaCriaturaDadosDto = {
    identidade: {
      designacao: 'A Estátua', origem: OrigemCriaturaEnum.ORIGINAL, conceito: 'x',
      naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA, motivacao: 'x', ganchoUnico: 'x',
    },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    modificadores: {
      destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
      pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.FRACO,
      vontade: ModificadorCriaturaEnum.FRACO,
    },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [], habilidades: [], anotacoes: '',
  };

  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: 7, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 11, nome: 'Vera', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

  function montar(opcoes: { usuarioLogadoId: number; acessos?: FichaAcessoResumoDto[] }) {
    const fichaCriatura: FichaCriaturaRecuperadaDto = {
      id: 4, campanhaId: 9, usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null, imagemFoco: null, oculta: false, dados,
    };
    const fichaService = {
      recuperarFichaCriatura: vi.fn(() => of(fichaCriatura)),
      listarAcessos: vi.fn(() => of(opcoes.acessos ?? [])),
      concederAcesso: vi.fn(() => of({ id: 1, fichaId: 4, usuarioId: 11 })),
      revogarAcesso: vi.fn(() => of({ fichaId: 4, usuarioId: 11 })),
      alterarFichaCriatura: vi.fn(
        () => of({ ...fichaCriatura, nome: 'Novo Nome' } as FichaCriaturaAlteradaDto),
      ),
      excluirFicha: vi.fn(() => of(undefined)),
    };
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const sessaoService = { usuario: () => ({ id: opcoes.usuarioLogadoId, login: 'u', nome: 'U', token: 't' }) };

    const fichaAlterada$ = new Subject<FichaCriaturaAlteradaDto>();
    const acessoRevogado$ = new Subject<FichaAcessoRevogadoDto>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      acessoRevogado$: acessoRevogado$.asObservable(),
      reconexao,
      conectado: signal(true),
    };
    const messageService = { add: vi.fn() };
    const rolagemService = { listarPorFicha: vi.fn(() => of({ itens: [], paginaAtual: 1, totalPaginas: 1 })) };

    TestBed.configureTestingModule({
      imports: [CriaturaVisualizar],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: MessageService, useValue: messageService },
        { provide: RolagemService, useValue: rolagemService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map<string, string | null>([['campanhaId', '9'], ['id', '4']]),
              queryParamMap: new Map<string, string>(),
            },
            parent: null,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(CriaturaVisualizar);
    const router = TestBed.inject(Router);
    const navegarEspiao = vi.spyOn(router, 'navigate');
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      fichaService,
      tempoRealService,
      fichaAlterada$,
      acessoRevogado$,
      reconexao,
      messageService,
      navegarEspiao,
    };
  }

  it('carrega a ficha de criatura pelo id da rota e a repassa ao CriaturaVisualizacao', () => {
    const { raiz, fichaService } = montar({ usuarioLogadoId: 7 });
    expect(fichaService.recuperarFichaCriatura).toHaveBeenCalledWith(4);
    expect(raiz.querySelector('app-criatura-visualizacao')).not.toBeNull();
  });

  it('não gerencia acesso nem busca acessos para quem não é dono/mestre', () => {
    const { raiz, fixture, fichaService } = montar({ usuarioLogadoId: 11 });
    expect(fixture.componentInstance['podeGerenciar']()).toBe(false);
    expect(raiz.querySelector('.acesso')).toBeNull();
    expect(fichaService.listarAcessos).not.toHaveBeenCalled();
  });

  it('gere o acesso via menu → dialog para o mestre (dono da criatura)', () => {
    const { raiz, fixture, fichaService } = montar({ usuarioLogadoId: 7 });
    expect(fixture.componentInstance['podeGerenciar']()).toBe(true);
    expect(fichaService.listarAcessos).toHaveBeenCalledWith(4);
    fixture.componentInstance['abrirAcesso']();
    fixture.detectChanges();
    expect(raiz.querySelector('.dialogo .acesso')).not.toBeNull();
  });

  it('entra na sala de tempo real da criatura e absorve ficha:alterada sem recarregar', () => {
    const { fixture, tempoRealService, fichaAlterada$ } = montar({ usuarioLogadoId: 7 });
    expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(4);

    fichaAlterada$.next({
      id: 4, campanhaId: 9, usuarioId: 7, nome: 'Renomeada Remotamente', cor: null, imagemUrl: null,
      oculta: false, dados,
    } as FichaCriaturaAlteradaDto);
    fixture.detectChanges();

    expect(fixture.componentInstance['ficha']()?.nome).toBe('Renomeada Remotamente');
  });

  it('exclui a criatura e navega de volta à campanha', () => {
    const { fixture, fichaService, navegarEspiao } = montar({ usuarioLogadoId: 7 });
    fixture.componentInstance['confirmarExclusao']();
    expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
    expect(navegarEspiao).toHaveBeenCalledWith(['/painel', 9]);
  });
});
