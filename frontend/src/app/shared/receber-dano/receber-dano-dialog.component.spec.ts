import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialog } from 'primeng/dialog';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';

import { ReceberDanoDialog } from './receber-dano-dialog.component';

/**
 * Prova o "tomador de dano facilitado" (m7-17): digitar brutos por tipo já mostra o resumo efetivo
 * ao vivo e, ao confirmar, emite o total pronto para abater da Vida — inclusive a assimetria da
 * camada Geral (irredutível, mas cuja resistência reduz qualquer outro tipo uma única vez).
 */
describe('ReceberDanoDialog', () => {
  function montar(resistenciasFicha: Partial<Record<TipoDanoEnum, number>> | null = null) {
    TestBed.configureTestingModule({ imports: [ReceberDanoDialog] });
    const fixture = TestBed.createComponent(ReceberDanoDialog);
    fixture.componentRef.setInput('aberto', true);
    if (resistenciasFicha) {
      fixture.componentRef.setInput('resistenciasFicha', resistenciasFicha);
    }
    fixture.detectChanges();
    return fixture;
  }

  function preencher(fixture: ReturnType<typeof montar>, tipo: TipoDanoEnum, campo: 'bruto' | 'custom', valor: number): void {
    const grupo = tipo === TipoDanoEnum.GERAL ? 'geral' : tipo;
    (fixture.componentInstance as unknown as { formulario: { controls: Record<string, { controls: Record<string, { setValue(v: number): void }> }> } })
      .formulario.controls[grupo].controls[campo].setValue(valor);
    fixture.detectChanges();
  }

  it('calcula e emite o total efetivo ao confirmar, com resistência da ficha', () => {
    const fixture = montar({
      [TipoDanoEnum.FISICO]: 15,
      [TipoDanoEnum.QUIMICO]: 5,
    });
    preencher(fixture, TipoDanoEnum.FISICO, 'bruto', 40);
    preencher(fixture, TipoDanoEnum.QUIMICO, 'bruto', 20);

    let totalEmitido: number | undefined;
    fixture.componentInstance.danoConfirmado.subscribe((total) => (totalEmitido = total));

    const botaoConfirmar = fixture.debugElement.query(By.css('.receber-dano__confirmar'));
    botaoConfirmar.nativeElement.click();

    expect(totalEmitido).toBe(40);
  });

  it('sem resistenciasFicha, calcula só com a resistência custom digitada', () => {
    const fixture = montar(null);
    preencher(fixture, TipoDanoEnum.BALISTICO, 'bruto', 30);
    preencher(fixture, TipoDanoEnum.BALISTICO, 'custom', 10);

    let totalEmitido: number | undefined;
    fixture.componentInstance.danoConfirmado.subscribe((total) => (totalEmitido = total));
    fixture.debugElement.query(By.css('.receber-dano__confirmar')).nativeElement.click();

    expect(totalEmitido).toBe(20);
  });

  it('dano Geral entra inteiro no total, irredutível mesmo com resistência Geral alta', () => {
    const fixture = montar({ [TipoDanoEnum.GERAL]: 100 });
    preencher(fixture, TipoDanoEnum.GERAL, 'bruto', 12);

    let totalEmitido: number | undefined;
    fixture.componentInstance.danoConfirmado.subscribe((total) => (totalEmitido = total));
    fixture.debugElement.query(By.css('.receber-dano__confirmar')).nativeElement.click();

    expect(totalEmitido).toBe(12);
  });

  it('mostra a resistência Geral da ficha na coluna Ficha, não só o custom (regressão)', () => {
    const fixture = montar({ [TipoDanoEnum.GERAL]: 3 });

    const colunaFicha = fixture.debugElement.queryAll(By.css('.receber-dano__resistencia-ficha'));
    const linhaGeral = colunaFicha[colunaFicha.length - 1];
    expect(linhaGeral.nativeElement.textContent.trim()).toBe('3');
    expect(linhaGeral.nativeElement.classList).not.toContain('receber-dano__resistencia-ficha--ausente');
  });

  it('não fecha ao clicar fora (máscara não dispensável) — só o Cancelar fecha', () => {
    const fixture = montar();
    const dialog = fixture.debugElement.query(By.directive(Dialog)).componentInstance as Dialog;
    expect(dialog.dismissableMask).toBe(false);
  });

  it('cancelar não emite dano', () => {
    const fixture = montar();
    preencher(fixture, TipoDanoEnum.FISICO, 'bruto', 40);

    let danoEmitido = false;
    let fechadoEmitido = false;
    fixture.componentInstance.danoConfirmado.subscribe(() => (danoEmitido = true));
    fixture.componentInstance.fechado.subscribe(() => (fechadoEmitido = true));

    fixture.debugElement.query(By.css('.receber-dano__cancelar')).nativeElement.click();

    expect(danoEmitido).toBe(false);
    expect(fechadoEmitido).toBe(true);
  });

  it('resumo ao vivo mostra só os tipos com dano bruto informado', () => {
    const fixture = montar();
    preencher(fixture, TipoDanoEnum.FISICO, 'bruto', 10);

    const linhas = fixture.debugElement.queryAll(By.css('.receber-dano__resumo-linhas .receber-dano__tipo'));
    expect(linhas.length).toBe(1);
    expect(linhas[0].nativeElement.textContent).toContain('Físico');
  });
});
