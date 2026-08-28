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
  RolagemVisibilidadeEnum,
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
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CriaturaVisualizar } from './visualizar-criatura.page';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RolagemService } from '../../rolagem.service';

/**
 * Prova a página que junta rota/WS/acesso/exclusão em torno de `CriaturaVisualizacao` (m4-04b) —
 * mesmo contrato de `FichaVisualizar` (m3-07), incluindo a ramificação `campanhaId` opcional
 * (m4-11): sob `/campanhas/:campanhaId/criatura/:id` vem da rota; sob `/fichas/criatura/:id`
 * (acervo) se resolve do payload da criatura carregada.
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

  function montar(opcoes: {
    usuarioLogadoId: number;
    acessos?: FichaAcessoResumoDto[];
    /** m4-11: sem `:campanhaId` na URL, simulando a rota `/fichas/criatura/:id` (acervo). */
    semCampanhaNaRota?: boolean;
    /** m4-11: `campanhaId` da criatura carregada — só relevante junto de `semCampanhaNaRota`. */
    fichaCampanhaId?: number | null;
  }) {
    const fichaCriatura: FichaCriaturaRecuperadaDto = {
      id: 4,
      campanhaId: opcoes.semCampanhaNaRota ? (opcoes.fichaCampanhaId ?? null) : 9,
      usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null, imagemFoco: null, oculta: false, dados,
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
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      acessoRevogado$: acessoRevogado$.asObservable(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
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
              // `ParamMap.get` real devolve `null` (não `undefined`) para uma chave ausente — o
              // `Map` do teste precisa da entrada explícita pra `lerParamRota` (`valor !== null`)
              // simular a ausência de `:campanhaId` sob `/fichas/criatura/:id` corretamente.
              paramMap: new Map<string, string | null>(
                opcoes.semCampanhaNaRota
                  ? [['campanhaId', null], ['id', '4']]
                  : [['campanhaId', '9'], ['id', '4']],
              ),
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
      campanhaService,
      tempoRealService,
      fichaAlterada$,
      acessoRevogado$,
      rolagemRegistrada$,
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

  describe('tempo real de rolagem (m3-77)', () => {
    function rolagemRemota(sobrescrever: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
      return {
        id: 501,
        fichaId: 4,
        encontroCombatenteId: null,
        campanhaId: 9,
        usuarioId: 7,
        nomeAutor: 'Mestre',
        nomeFicha: 'A Estátua',
        rotulo: 'Luta',
        visibilidade: RolagemVisibilidadeEnum.PRIVADA,
        resultado: { dados: [], atributos: [], constante: 0, total: 12 },
        createdDate: '2026-08-23T12:00:00.000Z',
        corFicha: null,
        ...sobrescrever,
      };
    }

    it('entra na sala da campanha (criatura vinculada) e a esquece ao destruir', () => {
      const { fixture, tempoRealService } = montar({ usuarioLogadoId: 7 });
      expect(tempoRealService.entrarSalaCampanha).toHaveBeenCalledWith(9);
      fixture.destroy();
      expect(tempoRealService.sairSalaCampanha).toHaveBeenCalledWith(9);
    });

    it('não entra em sala de campanha para uma criatura solta (m4-11)', () => {
      const { tempoRealService } = montar({
        usuarioLogadoId: 7,
        semCampanhaNaRota: true,
        fichaCampanhaId: null,
      });
      expect(tempoRealService.entrarSalaCampanha).not.toHaveBeenCalled();
    });

    it('rolagem de outro caminho: entra no histórico e abre a bandeja', () => {
      const { fixture, rolagemRegistrada$ } = montar({ usuarioLogadoId: 7 });
      const componente = fixture.componentInstance;
      const bandeja = TestBed.inject(BandejaDadosService);

      rolagemRegistrada$.next(rolagemRemota());

      expect(componente['historicoRolagens']()[0]?.id).toBe(501);
      expect(bandeja.entradas()[0]).toMatchObject({ rotulo: 'Luta' });
    });

    it('não duplica histórico nem reabre a bandeja quando a rolagem já chegou pelo caminho local', () => {
      const { fixture, rolagemRegistrada$ } = montar({ usuarioLogadoId: 7 });
      const componente = fixture.componentInstance;
      const bandeja = TestBed.inject(BandejaDadosService);
      const propria = rolagemRemota();

      componente['onRolagemRegistrada'](propria);
      bandeja.mostrar({
        rotulo: propria.rotulo,
        resultado: propria.resultado,
        corFicha: propria.corFicha,
        visibilidade: propria.visibilidade,
      });

      rolagemRegistrada$.next(propria);

      expect(componente['historicoRolagens']().length).toBe(1);
      expect(bandeja.entradas().length).toBe(1);
    });
  });

  it('exclui a criatura e navega de volta à campanha', () => {
    const { fixture, fichaService, navegarEspiao } = montar({ usuarioLogadoId: 7 });
    fixture.componentInstance['confirmarExclusao']();
    expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
    expect(navegarEspiao).toHaveBeenCalledWith(['/campanhas', 9]);
  });

  describe('criatura solta (m4-11)', () => {
    it('não busca membros, ehMestre fica false, dono ainda gerencia', () => {
      const { fixture, campanhaService } = montar({
        usuarioLogadoId: 7,
        semCampanhaNaRota: true,
        fichaCampanhaId: null,
      });

      expect(campanhaService.listarMembros).not.toHaveBeenCalled();
      expect(fixture.componentInstance['ehMestre']()).toBe(false);
      expect(fixture.componentInstance['ehDono']()).toBe(true);
      expect(fixture.componentInstance['podeGerenciar']()).toBe(true);
    });

    it('o link "Voltar" aponta pro acervo (/fichas) quando a criatura está solta', () => {
      const { raiz } = montar({ usuarioLogadoId: 7, semCampanhaNaRota: true, fichaCampanhaId: null });

      const voltar = raiz.querySelector('.ficha-pagina__voltar');
      expect(voltar?.getAttribute('aria-label')).toBe('Voltar ao acervo');
      expect(voltar?.getAttribute('href')).toBe('/fichas');
    });

    it('exclusão de uma criatura solta redireciona ao acervo (/fichas), não a /campanhas', () => {
      const { fixture, navegarEspiao } = montar({
        usuarioLogadoId: 7,
        semCampanhaNaRota: true,
        fichaCampanhaId: null,
      });

      fixture.componentInstance['confirmarExclusao']();

      expect(navegarEspiao).toHaveBeenCalledWith(['/fichas']);
    });

    it('sob a rota do acervo, resolve campanhaId do payload quando a criatura já foi atribuída', () => {
      const { campanhaService } = montar({
        usuarioLogadoId: 7,
        semCampanhaNaRota: true,
        fichaCampanhaId: 9,
      });

      expect(campanhaService.listarMembros).toHaveBeenCalledWith(9);
    });
  });
});
