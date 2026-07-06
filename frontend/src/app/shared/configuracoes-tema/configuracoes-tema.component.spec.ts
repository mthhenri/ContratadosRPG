import { TestBed } from '@angular/core/testing';

import { ConfiguracoesTema } from './configuracoes-tema.component';
import { TemaService } from '../../core/services/tema.service';

/**
 * Prova o painel de configurações de tema (m1-13): o gatilho abre o painel, a base e os presets
 * são selecionáveis, os presets travados pela base ficam desabilitados e o color picker sinaliza
 * quando a trava de contraste bloqueia uma cor. A lógica de tema é do `TemaService`; aqui só se
 * verifica a ligação da UI.
 */
describe('ConfiguracoesTema', () => {
  function montar() {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.add('dark');

    TestBed.configureTestingModule({ imports: [ConfiguracoesTema] });
    const fixture = TestBed.createComponent(ConfiguracoesTema);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const tema = TestBed.inject(TemaService);
    return {
      fixture,
      raiz,
      tema,
      abrir: () => {
        raiz.querySelector<HTMLButtonElement>('.config-gatilho')!.click();
        fixture.detectChanges();
      },
    };
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('mantém o painel fechado até o gatilho ser clicado', () => {
    const { raiz, abrir } = montar();
    expect(raiz.querySelector('.config-modal')).toBeNull();
    abrir();
    expect(raiz.querySelector('.config-modal')).not.toBeNull();
  });

  it('exibe os quatro presets de accent', () => {
    const { raiz, abrir } = montar();
    abrir();
    expect(raiz.querySelectorAll('.config-swatch').length).toBe(4);
  });

  it('troca a base para clara e desabilita o preset âmbar (travado no claro)', () => {
    const { raiz, fixture, tema, abrir } = montar();
    abrir();

    const botaoClaro = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.config-opcao')).find(
      (botao) => botao.textContent?.trim() === 'Claro',
    )!;
    botaoClaro.click();
    fixture.detectChanges();

    expect(tema.base()).toBe('claro');
    const ambar = raiz.querySelector<HTMLButtonElement>('.config-swatch--travado');
    expect(ambar).not.toBeNull();
    expect(ambar!.disabled).toBe(true);
  });

  it('sinaliza bloqueio quando o color picker recebe uma cor de baixo contraste', () => {
    const { raiz, fixture, abrir } = montar();
    abrir();

    const picker = raiz.querySelector<HTMLInputElement>('.config-custom__picker')!;
    picker.value = '#141821'; // quase igual à superfície escura — ilegível
    picker.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(raiz.querySelector('.config-custom__aviso')).not.toBeNull();
  });
});
