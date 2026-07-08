import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaAlteradaDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaDetalhe } from './detalhe.page';
import { CampanhaService } from '../../campanha.service';
import { CampanhaContextoService } from '../../campanha-contexto.service';
import { SessaoService } from '../../../../core/services/sessao.service';

/**
 * Prova o comportamento de frontend da m2-12 na tela de detalhe: só o mestre vê as ações de
 * editar/excluir; a edição chama `alterarCampanha` e reflete o resultado na tela e no seletor da
 * topbar (`CampanhaContextoService`); a exclusão exige confirmação e leva de volta à lista
 * (`/painel`). A autoridade é sempre o backend (§14) — aqui é só a camada de apresentação.
 */
describe('CampanhaDetalhe', () => {
  const CAMPANHA_ID = 8;

  const campanhaBase: CampanhaRecuperadaDto = {
    id: CAMPANHA_ID,
    nome: 'Contenção Delta',
    descricao: 'Operação em curso',
    codigoConvite: 'DEF456',
  };

  function membrosCom(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto[] {
    return [{ usuarioId, nome: 'Agente', papel }];
  }

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    alterarRetorno?: Observable<CampanhaAlteradaDto>;
  }) {
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(opts.membros)),
      alterarCampanha: vi.fn(() => opts.alterarRetorno ?? of({ ...campanhaBase } as CampanhaAlteradaDto)),
      excluirCampanha: vi.fn(() => of(undefined)),
      regenerarConvite: vi.fn(() => of({ id: CAMPANHA_ID, codigoConvite: 'NOVO' })),
    };
    const contextoService = { definir: vi.fn(), limpar: vi.fn() };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };

    TestBed.configureTestingModule({
      imports: [CampanhaDetalhe],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: CampanhaContextoService, useValue: contextoService },
        { provide: SessaoService, useValue: sessaoService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(CampanhaDetalhe);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaService,
      contextoService,
      navegar,
    };
  }

  const mestre = () => ({ usuarioId: 1, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });
  const jogador = () => ({ usuarioId: 2, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });

  it('mostra as ações de editar/excluir só para o mestre', () => {
    const { raiz } = montar(mestre());
    expect(raiz.querySelector('.detalhe__acoes')).not.toBeNull();
  });

  it('esconde as ações de editar/excluir do jogador', () => {
    const { raiz } = montar(jogador());
    expect(raiz.querySelector('.detalhe__acoes')).toBeNull();
  });

  it('edita nome/descrição e reflete o resultado na tela e na topbar', () => {
    const alterada: CampanhaAlteradaDto = {
      id: CAMPANHA_ID,
      nome: 'Contenção Ômega',
      descricao: 'Nova diretriz',
      codigoConvite: 'DEF456',
    };
    const { fixture, raiz, campanhaService, contextoService } = montar({
      ...mestre(),
      alterarRetorno: of(alterada),
    });

    // Abre o formulário de edição.
    (raiz.querySelectorAll('.detalhe__acoes button')[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const nome = raiz.querySelector('input.detalhe__entrada') as HTMLInputElement;
    nome.value = 'Contenção Ômega';
    nome.dispatchEvent(new Event('input'));
    const descricao = raiz.querySelector('textarea.detalhe__entrada') as HTMLTextAreaElement;
    descricao.value = 'Nova diretriz';
    descricao.dispatchEvent(new Event('input'));

    (raiz.querySelector('.detalhe__edicao') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(campanhaService.alterarCampanha).toHaveBeenCalledWith(CAMPANHA_ID, {
      nome: 'Contenção Ômega',
      descricao: 'Nova diretriz',
    });
    expect(contextoService.definir).toHaveBeenCalledWith({
      id: CAMPANHA_ID,
      nome: 'Contenção Ômega',
      codigoConvite: 'DEF456',
    });
    expect((raiz.querySelector('.card__titulo') as HTMLElement).textContent?.trim()).toBe('Contenção Ômega');
    expect(raiz.querySelector('.detalhe__edicao')).toBeNull();
  });

  it('exclui a campanha após confirmação e navega de volta à lista', () => {
    const { fixture, raiz, campanhaService, navegar } = montar(mestre());

    // "Excluir" (2ª ação) abre a confirmação inline — sem excluir ainda.
    (raiz.querySelectorAll('.detalhe__acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.detalhe__exclusao')).not.toBeNull();
    expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();

    // Confirma a exclusão.
    (raiz.querySelector('.detalhe__exclusao .botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.excluirCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(navegar).toHaveBeenCalledWith(['/painel']);
  });

  it('cancela a exclusão sem chamar o backend', () => {
    const { fixture, raiz, campanhaService } = montar(mestre());

    (raiz.querySelectorAll('.detalhe__acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe__exclusao .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.detalhe__exclusao')).toBeNull();
    expect(raiz.querySelector('.detalhe__acoes')).not.toBeNull();
    expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();
  });
});
