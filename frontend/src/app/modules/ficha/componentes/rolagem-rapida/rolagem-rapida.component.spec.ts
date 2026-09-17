import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { MontadorRolagem } from '../../../../shared/montador-rolagem/montador-rolagem.component';
import { RolagemRapida } from './rolagem-rapida.component';

/**
 * Prova a barra de Rolagem rápida (m3-31, extraída de `FichaRolagens` pra ser reusada pela aba
 * Ataques da ficha de criatura): digita e rola na hora, sem salvar preset — mostra na bandeja
 * global e emite `rolagemFeita` pra quem persiste o histórico.
 */
describe('RolagemRapida', () => {
  const atributos: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 3,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 3,
  };

  function montar(
    opcoes: {
      podeRolar?: boolean;
      atalhosDano?: { readonly corpo?: string | null; readonly furtivo?: string | null };
    } = {},
  ) {
    TestBed.configureTestingModule({ imports: [RolagemRapida] });
    const fixture = TestBed.createComponent(RolagemRapida);
    fixture.componentRef.setInput('atributos', atributos);
    fixture.componentRef.setInput('podeRolar', opcoes.podeRolar ?? true);
    if (opcoes.atalhosDano) {
      fixture.componentRef.setInput('atalhosDano', opcoes.atalhosDano);
    }
    const emitidas: unknown[] = [];
    fixture.componentInstance.rolagemFeita.subscribe((evento) => emitidas.push(evento));
    fixture.detectChanges();
    const bandeja = TestBed.inject(BandejaDadosService);
    const mostrar = vi.spyOn(bandeja, 'mostrar').mockImplementation(() => 1);
    return { fixture, componentInstance: fixture.componentInstance, emitidas, mostrar };
  }

  function montadorInstance(alvo: ReturnType<typeof montar>): MontadorRolagem {
    return alvo.fixture.debugElement.query(By.directive(MontadorRolagem))
      .componentInstance as MontadorRolagem;
  }

  it('rola na hora e emite rolagemFeita (m3-31)', () => {
    const alvo = montar();
    alvo.componentInstance['formula'].setValue('2d6 + 3 [Físico]');
    alvo.componentInstance['rolar']();
    expect(alvo.mostrar).toHaveBeenCalledOnce();
    const arg = alvo.mostrar.mock.calls[0][0];
    expect(arg.rotulo).toBe('Rolagem rápida');
    expect(arg.formula).toBe('2d6 + 3 [Físico]');
    // 2d6 (2..12) + 3 → total em [5, 15].
    expect(arg.resultado.total).toBeGreaterThanOrEqual(5);
    expect(arg.resultado.total).toBeLessThanOrEqual(15);
    expect(alvo.emitidas).toEqual([
      { rotulo: 'Rolagem rápida', formula: '2d6 + 3 [Físico]', resultado: arg.resultado },
    ]);
  });

  it('expande os atalhos CORPO/FURTIVO antes de rolar (m3-38)', () => {
    const alvo = montar({ atalhosDano: { corpo: '2D6 + FOR [Físico]', furtivo: null } });
    alvo.componentInstance['formula'].setValue('CORPO');
    alvo.componentInstance['rolar']();
    expect(alvo.mostrar).toHaveBeenCalledOnce();
    expect(alvo.mostrar.mock.calls[0][0].formula).toBe('2D6 + FOR [Físico]');
  });

  it('fórmula inválida não rola', () => {
    const alvo = montar();
    alvo.componentInstance['formula'].setValue('xyz');
    alvo.componentInstance['rolar']();
    expect(alvo.mostrar).not.toHaveBeenCalled();
  });

  it('sem podeRolar não rola e esconde a barra', () => {
    const alvo = montar({ podeRolar: false });
    expect(alvo.fixture.nativeElement.querySelector('.rolagem-rapida')).toBeNull();
    alvo.componentInstance['formula'].setValue('2d6');
    alvo.componentInstance['rolar']();
    expect(alvo.mostrar).not.toHaveBeenCalled();
  });

  describe('montador de rolagem (ui-35) — caixa flutuante de tokens', () => {
    it('sempre presente (a caixa flutuante controla o próprio aberto/fechado)', () => {
      const alvo = montar();
      expect(alvo.fixture.nativeElement.querySelector('app-montador-rolagem')).not.toBeNull();
    });

    it('token inserido no montador aparece na fórmula e é rolável (mesmo FormControl)', () => {
      const alvo = montar();
      const montador = montadorInstance(alvo);
      montador.formula.set('2d6 + FOR [Físico]');
      alvo.fixture.detectChanges();

      expect(alvo.componentInstance['formula'].value).toBe('2d6 + FOR [Físico]');
      alvo.componentInstance['rolar']();
      expect(alvo.mostrar).toHaveBeenCalledOnce();
      expect(alvo.mostrar.mock.calls[0][0].formula).toBe('2d6 + FOR [Físico]');
    });

    it('o output (rolar) do montador dispara o mesmo rolar() do botão externo', () => {
      const alvo = montar();
      alvo.componentInstance['formula'].setValue('2d6');
      const montador = montadorInstance(alvo);
      montador.rolar.emit();
      expect(alvo.mostrar).toHaveBeenCalledOnce();
      expect(alvo.mostrar.mock.calls[0][0].formula).toBe('2d6');
    });

    it('repassa atalhosDano e a validade já computada (formulaValida) para o montador', () => {
      const alvo = montar({ atalhosDano: { corpo: '2D6 + FOR [Físico]', furtivo: null } });
      alvo.componentInstance['formula'].setValue('2d6');
      alvo.fixture.detectChanges();

      const montador = montadorInstance(alvo);
      expect(montador.atalhosDano()).toEqual({ corpo: '2D6 + FOR [Físico]', furtivo: null });
      expect(montador.formulaValida()).toBe(true);
    });
  });
});
