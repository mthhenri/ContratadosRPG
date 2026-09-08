import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { signal } from '@angular/core';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto, CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaDetalheShell } from './detalhe-shell.page';
import { CampanhaDetalheMestre } from '../detalhe-mestre/detalhe-mestre.page';
import { CampanhaDetalheJogador } from '../detalhe-jogador/detalhe-jogador.page';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';

/**
 * Prova `CampanhaDetalheShell` — resolve o papel via `CampanhaDetalheDadosService.ehMestre()` e
 * monta o componente certo (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1).
 */
describe('CampanhaDetalheShell', () => {
  const CAMPANHA_ID = 8;

  function montar(membros: CampanhaMembroResumoDto[], usuarioId: number) {
    const campanhaBase: CampanhaRecuperadaDto = {
      id: CAMPANHA_ID,
      nome: 'Contenção Delta',
      descricao: null,
      codigoConvite: 'DEF456',
      codigoConviteEspectador: 'ESP456',
      naBase: true,
    };
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      enviarPresencaEsquadrao: vi.fn(),
      fichaCriada$: new Subject().asObservable(),
      membroEntrou$: new Subject().asObservable(),
      fichaAlterada$: new Subject().asObservable(),
      fichaVisibilidadeAlterada$: new Subject().asObservable(),
      rolagemRegistrada$: new Subject().asObservable(),
      estadoAlterado$: new Subject().asObservable(),
      inventarioAlterado$: new Subject().asObservable(),
      paginaEsquadraoCriada$: new Subject().asObservable(),
      paginaEsquadraoAlterada$: new Subject().asObservable(),
      paginaEsquadraoExcluida$: new Subject().asObservable(),
      presencaEsquadraoCaderno$: new Subject().asObservable(),
      reconexao: signal(0),
      conectado: () => true,
    };

    TestBed.configureTestingModule({
      imports: [CampanhaDetalheShell],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaService, useValue: { recuperarCampanha: vi.fn(() => of(campanhaBase)), listarMembros: vi.fn(() => of(membros)), recuperarInventario: vi.fn(() => of({ itens: [] })) } },
        { provide: FichaService, useValue: { listarFichas: vi.fn(() => of([])) } },
        { provide: RolagemService, useValue: { listarPorCampanha: vi.fn(() => of([])) } },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioId, login: 'x', nome: 'x' }) } },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: TopbarContextoService, useValue: { definir: vi.fn(), limpar: vi.fn() } },
        { provide: PaginaCadernoService, useValue: { listarPaginas: vi.fn(() => of([])), listarPaginasMembro: vi.fn(() => of([])), buscarCampanha: vi.fn(() => of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 })) } },
        { provide: ConfirmacaoService, useValue: { confirmar: vi.fn(() => Promise.resolve(true)) } },
      ],
    });

    const fixture = TestBed.createComponent(CampanhaDetalheShell);
    fixture.detectChanges();
    return fixture;
  }

  it('monta CampanhaDetalheMestre quando o usuário autenticado é o MESTRE', () => {
    const fixture = montar(
      [{ usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] }],
      1,
    );
    expect(fixture.debugElement.query(By.directive(CampanhaDetalheMestre))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(CampanhaDetalheJogador))).toBeNull();
  });

  it('monta CampanhaDetalheJogador quando o usuário autenticado não é o MESTRE', () => {
    const fixture = montar(
      [
        { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
      ],
      2,
    );
    expect(fixture.debugElement.query(By.directive(CampanhaDetalheJogador))).not.toBeNull();
    expect(fixture.debugElement.query(By.directive(CampanhaDetalheMestre))).toBeNull();
  });
});
