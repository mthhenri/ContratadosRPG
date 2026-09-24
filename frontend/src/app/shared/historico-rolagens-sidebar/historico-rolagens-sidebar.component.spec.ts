import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

import { HistoricoRolagensSidebar } from './historico-rolagens-sidebar.component';
import { HistoricoRolagensJanelaService } from './historico-rolagens-janela.service';

function criarItem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
  return {
    id: 1,
    fichaId: 3,
    encontroCombatenteId: null,
    campanhaId: 5,
    usuarioId: 1,
    nomeAutor: 'Agente',
    nomeFicha: 'Ficha',
    rotulo: 'Dano',
    formula: '2d6+3[Físico]',
    visibilidade: RolagemVisibilidadeEnum.PUBLICA,
    resultado: { dados: [], atributos: [], constante: 3, total: 9 },
    createdDate: new Date().toISOString(),
    corFicha: null,
    ...sobrescritas,
  };
}

describe('HistoricoRolagensSidebar', () => {
  let fixture: ComponentFixture<HistoricoRolagensSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricoRolagensSidebar],
    }).compileComponents();
    fixture = TestBed.createComponent(HistoricoRolagensSidebar);
    fixture.componentRef.setInput('itens', []);
    fixture.detectChanges();
  });

  it('expõe o gatilho no contrato compartilhado sem reservar a calculadora por padrão', () => {
    const gatilho = obterGatilho();

    expect(gatilho.classList).toContain('utilitario-flutuante');
    expect(gatilho.classList).toContain('utilitario-flutuante--historico');
    expect(gatilho.classList).toContain('utilitario-flutuante--inline-mobile');
    expect(gatilho.classList).not.toContain('utilitario-flutuante--acima');
  });

  it('traduz acimaDaCalculadora no modificador compartilhado e preserva o modificador legado', () => {
    fixture.componentRef.setInput('acimaDaCalculadora', true);
    fixture.detectChanges();

    const gatilho = obterGatilho();
    expect(gatilho.classList).toContain('utilitario-flutuante--acima');
    expect(gatilho.classList).toContain('historico-rolagens__gatilho--empilhado');
  });

  it('expõe a abertura para que a página reserve a coluna lateral', () => {
    obterGatilho().click();
    fixture.detectChanges();

    expect(fixture.componentRef.instance.aberto()).toBe(true);
    expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).not.toBeNull();
  });

  it('usa o contexto recebido no título visível e nos rótulos do histórico', () => {
    fixture.componentRef.setInput('titulo', 'Histórico de Rolagens da Campanha');
    fixture.detectChanges();

    const gatilho = obterGatilho();
    expect(gatilho.getAttribute('aria-label')).toBe('Abrir histórico de rolagens da campanha');

    gatilho.click();
    fixture.detectChanges();

    const painel = fixture.nativeElement.querySelector('.historico-rolagens__painel') as HTMLElement;
    expect(painel.getAttribute('aria-label')).toBe('Histórico de Rolagens da Campanha');
    expect(painel.querySelector('.historico-rolagens__titulo')?.textContent?.trim()).toBe(
      'Histórico de Rolagens da Campanha',
    );
  });

  it('abre a rota da ficha ou campanha em outra janela, inclusive na coluna fixa', () => {
    const janela = TestBed.inject(HistoricoRolagensJanelaService);
    const abrirFicha = vi.spyOn(janela, 'abrirFicha').mockReturnValue(true);
    const abrirCampanhaSpy = vi.spyOn(janela, 'abrirCampanha').mockReturnValue(true);
    try {
      fixture.componentRef.setInput('fichaIdJanela', 42);
      fixture.componentRef.setInput('tipoFichaJanela', 'criatura');
      obterGatilho().click();
      fixture.detectChanges();

      const botao = fixture.nativeElement.querySelector('.historico-rolagens__janela') as HTMLButtonElement;
      botao.click();
      expect(abrirFicha).toHaveBeenCalledWith(42, 'criatura');

      fixture.componentRef.setInput('tipoFichaJanela', 'jogador');
      fixture.detectChanges();
      botao.click();
      expect(abrirFicha).toHaveBeenLastCalledWith(42, 'jogador');

      fixture.componentRef.setInput('fichaIdJanela', null);
      fixture.componentRef.setInput('campanhaIdJanela', 8);
      fixture.componentRef.setInput('fixo', true);
      fixture.detectChanges();
      const abrirCampanha = fixture.nativeElement.querySelector(
        '.historico-rolagens__janela',
      ) as HTMLButtonElement;
      expect(abrirCampanha).not.toBeNull();
      expect(abrirCampanha.classList).toContain('botao-icone');
      abrirCampanha.click();
      expect(abrirCampanhaSpy).toHaveBeenLastCalledWith(8, 'campanha');

      fixture.componentRef.setInput('origemJanela', 'espectador');
      fixture.detectChanges();
      abrirCampanha.click();
      expect(abrirCampanhaSpy).toHaveBeenLastCalledWith(8, 'espectador');
    } finally {
      abrirFicha.mockRestore();
      abrirCampanhaSpy.mockRestore();
    }
  });

  it('retira o painel sobreposto sem perder o estado e o devolve ao fechar a janela', () => {
    vi.useFakeTimers();
    const janela = {
      closed: false,
      opener: window as Window | null,
      location: { replace: vi.fn() },
      close: vi.fn(),
      focus: vi.fn(),
    };
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    try {
      fixture.componentRef.setInput('fichaIdJanela', 42);
      obterGatilho().click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).not.toBeNull();

      (fixture.nativeElement.querySelector('.historico-rolagens__janela') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentRef.instance.aberto()).toBe(true);
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).toBeNull();

      janela.closed = true;
      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).not.toBeNull();
    } finally {
      abrir.mockRestore();
      vi.useRealTimers();
    }
  });

  it('mantém o painel montado durante a saída e cancela essa saída ao reabrir', () => {
    vi.useFakeTimers();
    try {
      const gatilho = obterGatilho();
      gatilho.click();
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('.historico-rolagens__fechar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentRef.instance.aberto()).toBe(false);
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel--saindo')).not.toBeNull();

      gatilho.click();
      fixture.detectChanges();
      vi.advanceTimersByTime(260);
      fixture.detectChanges();

      expect(fixture.componentRef.instance.aberto()).toBe(true);
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.historico-rolagens__painel--saindo')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('mostra o esqueleto de carregamento (ui-14) em vez de um texto solto', () => {
    fixture.componentRef.setInput('carregando', true);
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    expect(painel.querySelector('.historico-rolagens__esqueleto')).not.toBeNull();
    expect(painel.querySelectorAll('.historico-rolagens__esqueleto-item').length).toBe(3);
    expect(painel.querySelector('app-estado-vazio')).toBeNull();
  });

  it('mostra o estado vazio (ui-14) quando não há rolagens e o carregamento terminou', () => {
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    const estadoVazio = painel.querySelector('app-estado-vazio');
    expect(estadoVazio).not.toBeNull();
    expect(estadoVazio?.querySelector('.estado-vazio__titulo')?.textContent?.trim()).toBe(
      'Nenhuma rolagem ainda.',
    );
    expect(painel.querySelector('.historico-rolagens__esqueleto')).toBeNull();
  });

  it('mostra a expressão da rolagem como legenda discreta abaixo do rótulo', () => {
    fixture.componentRef.setInput('itens', [criarItem({ formula: '2d6+3[Físico]' })]);
    obterGatilho().click();
    fixture.detectChanges();

    const formula = (fixture.nativeElement as HTMLElement).querySelector(
      '.cartao-rolagem__formula',
    );
    expect(formula?.textContent?.trim()).toBe('2d6+3[Físico]');
  });

  it('omite a legenda de expressão no teste de Atributo direto (formula nula)', () => {
    fixture.componentRef.setInput('itens', [criarItem({ rotulo: 'Luta', formula: null })]);
    obterGatilho().click();
    fixture.detectChanges();

    const painel = fixture.nativeElement as HTMLElement;
    expect(painel.querySelector('.cartao-rolagem__formula')).toBeNull();
  });

  it('mostra "Mestre" como origem da rolagem avulsa do mestre, nunca "null" (P-076)', () => {
    fixture.componentRef.setInput("itens", [
      criarItem({ fichaId: null, nomeAutor: "Codex", nomeFicha: null }),
    ]);
    obterGatilho().click();
    fixture.detectChanges();

    const autor = (fixture.nativeElement as HTMLElement).querySelector(".cartao-rolagem__autor");
    expect(autor?.textContent?.trim()).toBe("Codex · Mestre");
  });

  it("omite a origem quando a tela já é o contexto da ficha (mostrarFicha = false)", () => {
    fixture.componentRef.setInput("mostrarFicha", false);
    fixture.componentRef.setInput("itens", [criarItem({ nomeAutor: "Codex" })]);
    obterGatilho().click();
    fixture.detectChanges();

    const autor = (fixture.nativeElement as HTMLElement).querySelector(".cartao-rolagem__autor");
    expect(autor?.textContent?.trim()).toBe("Codex");
  });

  describe('modo fixo (ui-37)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('fixo', true);
      fixture.componentRef.setInput('itens', [criarItem({ rotulo: 'Ataque' })]);
      fixture.detectChanges();
    });

    it('renderiza a coluna sem gatilho, sem fundo e sem botão de fechar', () => {
      const raiz = fixture.nativeElement as HTMLElement;

      expect(obterGatilho()).toBeNull();
      expect(raiz.querySelector('.historico-rolagens__fundo')).toBeNull();
      expect(raiz.querySelector('.historico-rolagens__fechar')).toBeNull();
      expect(raiz.querySelector('.historico-rolagens__painel--fixo')).not.toBeNull();
      expect(raiz.querySelector('.cartao-rolagem__rotulo')?.textContent).toContain('Ataque');
    });

    it('não é focável, então o autofoco do painel sobreposto nunca rouba o foco da página', () => {
      const painel = (fixture.nativeElement as HTMLElement).querySelector(
        '.historico-rolagens__painel',
      ) as HTMLElement;

      expect(painel.hasAttribute('tabindex')).toBe(false);
    });

    it('mantém a contagem visível no cabeçalho', () => {
      const contagem = (fixture.nativeElement as HTMLElement).querySelector(
        '.historico-rolagens__contagem',
      );

      expect(contagem?.textContent?.trim()).toBe('1');
    });
  });

  function obterGatilho(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '.historico-rolagens__gatilho',
    ) as HTMLButtonElement;
  }
});
