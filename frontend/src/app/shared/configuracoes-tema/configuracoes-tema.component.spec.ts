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
  function montar(variante: 'topbar' | 'menu' = 'topbar') {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.add('dark');

    TestBed.configureTestingModule({ imports: [ConfiguracoesTema] });
    const fixture = TestBed.createComponent(ConfiguracoesTema);
    fixture.componentRef.setInput('variante', variante);
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

  it('variante "menu" (tema dentro do menu de perfil, mobile): o gatilho vira item de menu e abre o mesmo painel', () => {
    const { raiz, abrir } = montar('menu');
    const gatilho = raiz.querySelector('.config-gatilho')!;
    expect(gatilho.classList).toContain('config-gatilho--menu');
    expect(gatilho.getAttribute('role')).toBe('menuitem');

    abrir();
    expect(raiz.querySelector('.config-modal')).not.toBeNull();
  });

  it('exibe todos os presets de accent, sem swatch salvo enquanto nada foi salvo', () => {
    const { raiz, tema, abrir } = montar();
    abrir();
    expect(raiz.querySelectorAll('.config-swatch').length).toBe(tema.presetsExibicao().length);
    expect(raiz.querySelector('.config-swatch--salvo')).toBeNull();
  });

  it('salvar a cor do picker cria um swatch salvo re-selecionável', () => {
    const { raiz, fixture, tema, abrir } = montar();
    abrir();

    raiz.querySelector<HTMLButtonElement>('.config-custom__salvar')!.click();
    fixture.detectChanges();

    const swatchSalvo = raiz.querySelector<HTMLButtonElement>('.config-swatch--salvo');
    expect(swatchSalvo).not.toBeNull();
    expect(tema.accentCustomSalvo()).toBe(tema.accentEfetivo());
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
