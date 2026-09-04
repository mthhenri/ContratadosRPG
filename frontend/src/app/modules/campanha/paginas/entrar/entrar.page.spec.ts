import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaEntradaDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaEntrar } from './entrar.page';
import { CampanhaService } from '../../campanha.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';

/**
 * Prova a bifurcação pós-entrada (m8-03): o mesmo campo "Código de convite" leva a `JOGADOR` ou a
 * `ESPECTADOR` conforme o `papel` que o backend resolveu (`CampanhaEntradaDto`) — o formulário
 * nunca escolhe, só informa o código.
 */
describe('CampanhaEntrar', () => {
  function montar(entrada: CampanhaEntradaDto) {
    const campanhaService = { entrarCampanha: vi.fn(() => of(entrada)) };

    TestBed.configureTestingModule({
      imports: [CampanhaEntrar],
      providers: [
        provideRouter([]),
        { provide: CampanhaService, useValue: campanhaService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const notificacaoService = TestBed.inject(NotificacaoService);
    const notificar = vi.spyOn(notificacaoService, 'notificar');

    const fixture = TestBed.createComponent(CampanhaEntrar);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    const campoCodigo = raiz.querySelector('input[formControlName="codigoConvite"]') as HTMLInputElement;
    campoCodigo.value = 'ABCD1234';
    campoCodigo.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    return { fixture, raiz, campanhaService, navegar, notificar };
  }

  it('entrando como JOGADOR, navega ao detalhe normal e avisa o papel obtido', () => {
    const { fixture, raiz, navegar, notificar } = montar({
      id: 5,
      nome: 'Contenção Gama',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledWith(['/campanhas', 5]);
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'sucesso', resumo: 'Você entrou como Jogador' }),
    );
  });

  it('entrando como ESPECTADOR, navega direto ao Painel do espectador e avisa o papel obtido', () => {
    const { fixture, raiz, navegar, notificar } = montar({
      id: 9,
      nome: 'Contenção Ômega',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
    });

    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledWith(['/campanhas', 9, 'espectador']);
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'sucesso', resumo: 'Você entrou como Espectador' }),
    );
  });

  it('envia só o código — nenhum seletor de papel existe no formulário', () => {
    const { raiz, campanhaService, fixture } = montar({
      id: 5,
      nome: 'Contenção Gama',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    });

    expect(raiz.querySelector('select')).toBeNull();
    expect(raiz.querySelectorAll('input[type="radio"]')).toHaveLength(0);

    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(campanhaService.entrarCampanha).toHaveBeenCalledWith({ codigoConvite: 'ABCD1234' });
  });
});
