import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { MontadorRolagem } from '../../../../shared/montador-rolagem/montador-rolagem.component';
import { MontadorRolagemExperimental } from '../../../../shared/montador-rolagem-experimental/montador-rolagem-experimental.component';
import { MontadorVersaoPreferenciaService } from '../../../../shared/montador-rolagem-experimental/montador-versao-preferencia.service';
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
      tipoUsuario?: TipoUsuarioEnum | null;
    } = {},
  ) {
    const tipo = opcoes.tipoUsuario === undefined ? TipoUsuarioEnum.TESTER : opcoes.tipoUsuario;
    TestBed.configureTestingModule({
      imports: [RolagemRapida],
      providers: [
        {
          provide: SessaoService,
          useValue: { usuario: signal(tipo ? { id: 1, login: 'teste', nome: 'Teste', token: 't', tipo } : null) },
        },
      ],
    });
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

  describe('gate único e seletor de versão do montador (montador-exp-02)', () => {
    const CHAVE_VERSAO = 'contratados-rpg.montador-rolagem.versao';
    afterEach(() => localStorage.removeItem(CHAVE_VERSAO));

    it.each([TipoUsuarioEnum.TESTER, TipoUsuarioEnum.ADMIN])('%s vê o gatilho e o seletor', (tipoUsuario) => {
      const alvo = montar({ tipoUsuario });
      const raiz = alvo.fixture.nativeElement as HTMLElement;
      expect(raiz.querySelector('app-montador-seletor-versao')).not.toBeNull();
      expect(raiz.querySelector('.montador-rolagem__gatilho')).not.toBeNull();
    });

    it.each([TipoUsuarioEnum.NORMAL, null])('%s não vê montador nem seletor', (tipoUsuario) => {
      const alvo = montar({ tipoUsuario });
      const raiz = alvo.fixture.nativeElement as HTMLElement;
      expect(raiz.querySelector('app-montador-seletor-versao')).toBeNull();
      expect(raiz.querySelector('.montador-rolagem__gatilho')).toBeNull();
      expect(raiz.querySelector('.montador-exp__gatilho')).toBeNull();
    });

    it('jogador comum com uma versão nova guardada continua sem montador', () => {
      localStorage.setItem(CHAVE_VERSAO, 'ESSENCIAL');
      const alvo = montar({ tipoUsuario: TipoUsuarioEnum.NORMAL });
      const raiz = alvo.fixture.nativeElement as HTMLElement;
      expect(raiz.querySelector('app-montador-rolagem-experimental')).toBeNull();
      expect(raiz.querySelector('.montador-rolagem__gatilho')).toBeNull();
    });

    it('o seletor troca entre o Atual e as versões novas sem perder a fórmula da barra', () => {
      const alvo = montar();
      const raiz = alvo.fixture.nativeElement as HTMLElement;
      alvo.componentInstance['formula'].setValue('(pon+1)d20kh1cm1+prof+6');
      const itens = () => Array.from(raiz.querySelectorAll<HTMLButtonElement>('.montador-seletor__item'));
      expect(itens().map((item) => item.textContent?.trim())).toEqual(['Atual', 'Essencial', 'Completo', 'Blocos']);
      expect(itens()[0].getAttribute('aria-pressed')).toBe('true');

      itens()[1].click();
      alvo.fixture.detectChanges();
      expect(raiz.querySelector('app-montador-rolagem')).toBeNull();
      const experimental = alvo.fixture.debugElement.query(By.directive(MontadorRolagemExperimental))
        .componentInstance as MontadorRolagemExperimental;
      expect(experimental.versao()).toBe('ESSENCIAL');
      expect(experimental.formula()).toBe('(pon+1)d20kh1cm1+prof+6');
      expect(TestBed.inject(MontadorVersaoPreferenciaService).versao()).toBe('ESSENCIAL');

      itens()[0].click();
      alvo.fixture.detectChanges();
      expect(raiz.querySelector('app-montador-rolagem-experimental')).toBeNull();
      expect(montadorInstance(alvo).formula()).toBe('(pon+1)d20kh1cm1+prof+6');
      expect(alvo.componentInstance['formula'].value).toBe('(pon+1)d20kh1cm1+prof+6');
    });

    it('a rolagem pelo montador novo vira o último resultado mostrado na janela', () => {
      localStorage.setItem(CHAVE_VERSAO, 'COMPLETO');
      const alvo = montar();
      alvo.componentInstance['formula'].setValue('2d6');
      alvo.fixture.detectChanges();
      const experimental = alvo.fixture.debugElement.query(By.directive(MontadorRolagemExperimental))
        .componentInstance as MontadorRolagemExperimental;
      experimental.rolar.emit();
      alvo.fixture.detectChanges();
      expect(alvo.mostrar).toHaveBeenCalledOnce();
      expect(experimental.ultimaRolagem()?.formula).toBe('2d6');
    });

    it('abrir o Atual com uma fórmula nova (conta na quantidade de dados) não quebra', () => {
      const alvo = montar();
      const raiz = alvo.fixture.nativeElement as HTMLElement;
      alvo.componentInstance['formula'].setValue('((FOR+VIG)*2)d4');
      alvo.fixture.detectChanges();
      raiz.querySelector<HTMLButtonElement>('.montador-rolagem__gatilho')!.click();
      alvo.fixture.detectChanges();
      expect(document.querySelector<HTMLInputElement>('.montador-rolagem__visor')?.value).toBe('((FOR+VIG)*2)d4');
      expect(montadorInstance(alvo).formulaValida()).toBe(true);
    });
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
