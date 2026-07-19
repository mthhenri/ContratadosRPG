import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAssistenteResultado } from '../../ficha-padrao';

import { FichaCriarDialog } from './ficha-criar-dialog.component';

/**
 * Prova o assistente de criação (m3-16): coleta as escolhas cruciais, aplica limites da classe e o
 * bônus fixo de arquétipo (na Maestria) e emite as escolhas base ao confirmar. O seletor de dono
 * (m2-16b, só mestre — §14) é provado à parte, mais abaixo.
 */
describe('FichaCriarDialog', () => {
  function montar(inputs: {
    podeEscolherDono?: boolean;
    membros?: readonly { usuarioId: number; nome: string }[];
    usuarioAtivoId?: number | null;
  } = {}) {
    TestBed.configureTestingModule({ imports: [FichaCriarDialog] });
    const fixture = TestBed.createComponent(FichaCriarDialog);
    const componente = fixture.componentInstance;
    fixture.componentRef.setInput('podeEscolherDono', inputs.podeEscolherDono ?? false);
    fixture.componentRef.setInput('membros', inputs.membros ?? []);
    fixture.componentRef.setInput('usuarioAtivoId', inputs.usuarioAtivoId ?? null);
    const criado: FichaAssistenteResultado[] = [];
    const cancelado = vi.fn();
    fixture.componentRef.instance.criar.subscribe((resultado: FichaAssistenteResultado) =>
      criado.push(resultado),
    );
    fixture.componentRef.instance.cancelar.subscribe(() => cancelado());
    fixture.detectChanges();
    return { fixture, componente, raiz: fixture.nativeElement as HTMLElement, criado, cancelado };
  }

  /** Muda um `<select>` por seletor e dispara o evento de mudança. */
  function selecionar(raiz: HTMLElement, seletor: string, valor: string): void {
    const select = raiz.querySelector(seletor) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  it('confirma emitindo as escolhas base (padrão: Combatente, nível 0, atributos base)', () => {
    const { fixture, raiz, criado } = montar();
    (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(criado).toHaveLength(1);
    expect(criado[0].opcoes).toMatchObject({
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
      prestigio: 0,
      maestria: null,
    });
    expect(criado[0].opcoes.atributos.forca).toBe(1);
    // Sem seletor de dono (jogador comum) — nunca emite usuarioId, o backend resolve o próprio.
    expect(criado[0].usuarioId).toBeUndefined();
  });

  it('trocar para Civil reclampa atributos/nível e oculta o arquétipo', () => {
    const { fixture, componente, raiz } = montar();
    // Sobe Vigor além do teto do Civil.
    for (let i = 0; i < 6; i++) {
      componente['passoAtributo']('vigor', 1);
    }
    fixture.detectChanges();

    selecionar(raiz, '#criar-classe', ClasseEnum.CIVIL);
    fixture.detectChanges();

    // Sem segundo select de arquétipo, e o Vigor foi reclampado ao teto 3 do Civil.
    expect(raiz.querySelector('#criar-arquetipo')).toBeNull();
    expect(componente['atributos']()['vigor']).toBe(3);
  });

  it('mostra o bônus do arquétipo e habilita a Maestria pelo total (base + bônus)', () => {
    const { fixture, componente, raiz } = montar();
    selecionar(raiz, '#criar-classe', ClasseEnum.COMBATENTE);
    selecionar(raiz, '#criar-arquetipo', ArquetipoEnum.LUTADOR);
    // Base 5 de Força; Lutador soma +1 → total 6, habilita a Maestria.
    for (let i = 0; i < 4; i++) {
      componente['passoAtributo']('forca', 1);
    }
    fixture.detectChanges();

    expect(raiz.querySelector('.criar__bonus')?.textContent).toContain('FOR');
    expect(componente['maestriaHabilitada']('forca')).toBe(true);

    componente['alternarMaestria']('forca');
    fixture.detectChanges();
    (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();
    // Emite Força base 5 (o bônus é reaplicado na montagem) e a Maestria em Força.
    // (a validação do total 6+ acontece em construirFichaInicial)
    expect(componente['maestria']()).toBe('forca');
  });

  it('reduzir o atributo com Maestria abaixo de 6 (total) a limpa', () => {
    const { fixture, componente } = montar();
    for (let i = 0; i < 5; i++) {
      componente['passoAtributo']('vigor', 1); // total 6
    }
    componente['alternarMaestria']('vigor');
    expect(componente['maestria']()).toBe('vigor');

    componente['passoAtributo']('vigor', -1); // total 5 → Maestria some
    fixture.detectChanges();
    expect(componente['maestria']()).toBeNull();
  });

  it('cancelar emite o fechamento', () => {
    const { raiz, cancelado } = montar();
    (raiz.querySelector('.botao--secundario') as HTMLButtonElement).click();
    expect(cancelado).toHaveBeenCalled();
  });

  // Seletor de dono (m2-16b) — só o mestre pode criar a ficha em nome de outro membro (§14).
  describe('seletor de dono (só mestre)', () => {
    const membros = [
      { usuarioId: 1, nome: 'Mestre Um' },
      { usuarioId: 2, nome: 'Jogador Dois' },
    ];

    it('não mostra o seletor quando o autenticado não pode escolher (jogador comum)', () => {
      const { raiz } = montar({ podeEscolherDono: false, membros, usuarioAtivoId: 2 });
      expect(raiz.querySelector('#criar-dono')).toBeNull();
    });

    it('mostra o seletor pré-selecionado no próprio autenticado quando ele é mestre', () => {
      const { raiz } = montar({ podeEscolherDono: true, membros, usuarioAtivoId: 1 });
      const select = raiz.querySelector('#criar-dono') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.value).toBe('1');
      expect(select.options[0].textContent).toContain('(Você)');
    });

    it('confirmar sem mexer no seletor emite o usuarioId do próprio mestre', () => {
      const { fixture, raiz, criado } = montar({ podeEscolherDono: true, membros, usuarioAtivoId: 1 });
      (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(criado[0].usuarioId).toBe(1);
    });

    it('trocar o seletor para outro membro emite o usuarioId escolhido', () => {
      const { fixture, raiz, criado } = montar({ podeEscolherDono: true, membros, usuarioAtivoId: 1 });
      selecionar(raiz, '#criar-dono', '2');
      fixture.detectChanges();
      (raiz.querySelector('.botao--primario') as HTMLButtonElement).click();

      expect(criado[0].usuarioId).toBe(2);
    });
  });
});
