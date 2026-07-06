import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';

import {
  CONTRASTE_MINIMO,
  PRESETS_ACCENT,
  TemaService,
  luminanciaRelativa,
  nomearCor,
  razaoContraste,
  variantePorContraste,
} from './tema.service';

/**
 * Prova o motor de tema em runtime (m1-13): matemática de contraste (WCAG), a trava que bloqueia
 * accents ilegíveis, a aplicação das CSS custom properties em `<html>`, a alternância
 * claro/escuro e a persistência restaurada no boot.
 */
describe('TemaService', () => {
  let raiz: HTMLElement;

  function criar(): TemaService {
    TestBed.configureTestingModule({});
    const documento = TestBed.inject(DOCUMENT);
    raiz = documento.documentElement;
    return TestBed.inject(TemaService);
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    document.documentElement.classList.add('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  describe('contraste (WCAG)', () => {
    it('luminância relativa: preto = 0, branco = 1', () => {
      expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 5);
      expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 5);
    });

    it('razão de contraste preto/branco = 21', () => {
      expect(razaoContraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
    });

    it('cores iguais têm contraste 1', () => {
      expect(razaoContraste('#4c8dd0', '#4c8dd0')).toBeCloseTo(1, 5);
    });
  });

  describe('trava de contraste por base', () => {
    it('âmbar é travado na base clara (fundo branco) e liberado na escura', () => {
      const tema = criar();

      expect(tema.base()).toBe('escuro');
      const ambarEscuro = tema.presetsExibicao().find((preset) => preset.id === 'ambar');
      expect(ambarEscuro?.travado).toBe(false);

      tema.definirBase('claro');
      const ambarClaro = tema.presetsExibicao().find((preset) => preset.id === 'ambar');
      expect(ambarClaro?.travado).toBe(true);
    });

    it('vermelho (padrão) permanece legível nas duas bases', () => {
      const superficieEscura = '#13161b';
      const superficieClara = '#ffffff';
      expect(razaoContraste('#e5484d', superficieEscura)).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
      expect(razaoContraste('#e5484d', superficieClara)).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
    });
  });

  describe('aplicação no DOM', () => {
    it('aplica o accent do preset selecionado em --accent', () => {
      const tema = criar();
      tema.selecionarPreset('azul');
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#4c8dd0');
    });

    it('base clara escreve overrides de superfície; escura os remove', () => {
      const tema = criar();

      tema.definirBase('claro');
      expect(raiz.style.getPropertyValue('--surface').trim()).toBe('#ffffff');
      expect(raiz.classList.contains('dark')).toBe(false);

      tema.definirBase('escuro');
      expect(raiz.style.getPropertyValue('--surface').trim()).toBe('');
      expect(raiz.classList.contains('dark')).toBe(true);
    });
  });

  describe('accent custom com trava', () => {
    it('bloqueia (retorna false) uma cor com contraste insuficiente e não aplica', () => {
      const tema = criar();
      tema.selecionarPreset('azul');

      // Um azul quase igual à superfície escura — ilegível.
      const aplicado = tema.definirAccentCustom('#141821');
      expect(aplicado).toBe(false);
      expect(tema.accentCustom()).toBeNull();
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#4c8dd0');
    });

    it('aplica (retorna true) uma cor legível', () => {
      const tema = criar();
      const aplicado = tema.definirAccentCustom('#7ab4f0');
      expect(aplicado).toBe(true);
      expect(tema.accentCustom()).toBe('#7ab4f0');
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#7ab4f0');
    });
  });

  describe('alternância de base cai em accent seguro', () => {
    it('ao ir para claro com âmbar ativo, troca para um preset legível', () => {
      const tema = criar();
      tema.selecionarPreset('ambar');
      expect(tema.accentEfetivo()).toBe('#d9a441');

      tema.definirBase('claro');
      expect(tema.presetId()).not.toBe('ambar');
      expect(razaoContraste(tema.accentEfetivo(), '#ffffff')).toBeGreaterThanOrEqual(
        CONTRASTE_MINIMO,
      );
    });
  });

  describe('persistência', () => {
    it('salva a escolha e a restaura no boot', () => {
      const primeiro = criar();
      primeiro.definirBase('claro');
      primeiro.selecionarPreset('verde');

      TestBed.resetTestingModule();
      const restaurado = criar();
      restaurado.iniciar();

      expect(restaurado.base()).toBe('claro');
      expect(restaurado.presetId()).toBe('verde');
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#4a9d6b');
    });

    it('mantém as quatro cores oficiais do tema no início da lista de presets', () => {
      const primeirasQuatro = PRESETS_ACCENT.slice(0, 4).map((preset) => preset.cor);
      expect(primeirasQuatro).toEqual(['#e5484d', '#4c8dd0', '#4a9d6b', '#d9a441']);
    });

    it('inclui as cores principais adicionais pedidas (m1-16)', () => {
      const ids = PRESETS_ACCENT.map((preset) => preset.id);
      expect(ids).toEqual(
        expect.arrayContaining(['roxo', 'rosa', 'dourado', 'turquesa', 'cinza']),
      );
    });
  });

  describe('slot custom salvo (m1-16)', () => {
    it('salva a cor do picker como um slot re-selecionável e a torna o accent ativo', () => {
      const tema = criar();
      tema.salvarAccentCustom('#7ab4f0');

      expect(tema.accentCustomSalvo()).toBe('#7ab4f0');
      expect(tema.accentCustom()).toBe('#7ab4f0');
      expect(tema.salvoAtivo()).toBe(true);
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#7ab4f0');
    });

    it('sobrescreve o slot anterior (nunca acumula mais de um)', () => {
      const tema = criar();
      tema.salvarAccentCustom('#7ab4f0');
      tema.salvarAccentCustom('#4a9d6b');
      expect(tema.accentCustomSalvo()).toBe('#4a9d6b');
    });

    it('re-seleciona o slot salvo mesmo ilegível na base atual, exibindo variante adaptada', () => {
      const tema = criar();
      // Branco é legível no escuro; salvamos e trocamos para a base clara (onde fica ilegível).
      tema.salvarAccentCustom('#ffffff');
      tema.definirBase('claro');

      // Valor salvo/selecionado permanece o original...
      expect(tema.accentCustomSalvo()).toBe('#ffffff');
      expect(tema.accentEfetivo()).toBe('#ffffff');
      expect(tema.accentAdaptado()).toBe(true);
      // ...mas o --accent aplicado é uma variante legível na base clara.
      const aplicado = raiz.style.getPropertyValue('--accent').trim();
      expect(aplicado).not.toBe('#ffffff');
      expect(razaoContraste(aplicado, '#ffffff')).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);

      // Ao voltar para a base compatível, a cor original é reaplicada tal como salva.
      tema.definirBase('escuro');
      expect(tema.accentAdaptado()).toBe(false);
      expect(raiz.style.getPropertyValue('--accent').trim()).toBe('#ffffff');
    });

    it('persiste e restaura o slot salvo (independente do custom ativo)', () => {
      const primeiro = criar();
      primeiro.salvarAccentCustom('#7ab4f0');
      primeiro.selecionarPreset('azul');

      TestBed.resetTestingModule();
      const restaurado = criar();
      restaurado.iniciar();

      expect(restaurado.accentCustomSalvo()).toBe('#7ab4f0');
      expect(restaurado.presetId()).toBe('azul');
      expect(restaurado.salvoAtivo()).toBe(false);
    });
  });

  describe('variantePorContraste (inversão legível, pura)', () => {
    it('branco na base clara vira preto (complemento legível)', () => {
      expect(variantePorContraste('#ffffff', '#ffffff', 'claro')).toBe('#000000');
    });

    it('a variante sempre atinge o piso de contraste na superfície', () => {
      // Um azul-claro ilegível no branco: a variante retornada precisa passar o piso.
      const variante = variantePorContraste('#7ab4f0', '#ffffff', 'claro');
      expect(variante).not.toBeNull();
      expect(razaoContraste(variante!, '#ffffff')).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
    });
  });

  describe('nomearCor (nome aproximado, m1-16)', () => {
    it('nomeia as faixas de matiz principais', () => {
      expect(nomearCor('#e5484d')).toBe('Vermelho');
      expect(nomearCor('#4c8dd0')).toBe('Azul');
      expect(nomearCor('#4a9d6b')).toBe('Verde');
      expect(nomearCor('#9a6dd7')).toBe('Roxo');
      expect(nomearCor('#d95a9d')).toBe('Rosa');
      expect(nomearCor('#3bb9b3')).toBe('Turquesa');
    });

    it('reconhece tons de cinza (baixa saturação) e os extremos preto/branco', () => {
      expect(nomearCor('#8b929b')).toBe('Cinza');
      expect(nomearCor('#000000')).toBe('Preto');
      expect(nomearCor('#ffffff')).toBe('Branco');
    });
  });
});
