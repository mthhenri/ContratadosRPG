import { TestBed } from '@angular/core/testing';

import { CenaTipoEnum } from '@contratados-rpg/shared/enums';

import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CenaTrocarTipoDialog } from './cena-trocar-tipo-dialog.component';

/**
 * Prova o dialog "Trocar tipo" (`cena-trocar-tipo`): o tipo atual aparece indisponível, a escolha
 * sai por `escolhido` e, com combate aberto, só depois da confirmação — a troca o encerra.
 */
describe('CenaTrocarTipoDialog', () => {
  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  function montar(combateAberto: boolean, confirma = true) {
    const confirmacaoService = { confirmar: vi.fn(() => Promise.resolve(confirma)) };
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmacaoService, useValue: confirmacaoService }],
    });
    const fixture = TestBed.createComponent(CenaTrocarTipoDialog);
    fixture.componentRef.setInput('nomeCena', 'Sessão 7');
    fixture.componentRef.setInput('tipoAtual', CenaTipoEnum.COMBATE);
    fixture.componentRef.setInput('combateAberto', combateAberto);
    const escolhidos: CenaTipoEnum[] = [];
    fixture.componentInstance.escolhido.subscribe((tipo) => escolhidos.push(tipo));
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, confirmacaoService, escolhidos };
  }

  function abrirOpcoes(contexto: ReturnType<typeof montar>): HTMLElement[] {
    contexto.raiz.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
    contexto.fixture.detectChanges();
    return Array.from(contexto.raiz.querySelectorAll<HTMLElement>('[role="option"]'));
  }

  function escolher(contexto: ReturnType<typeof montar>, rotulo: string): void {
    abrirOpcoes(contexto).find((opcao) => texto(opcao) === rotulo)!.click();
    contexto.fixture.detectChanges();
  }

  const botaoTrocar = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => texto(item) === 'Trocar tipo',
    )!;

  const assentar = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('marca o tipo atual como indisponível e só libera "Trocar tipo" com outro escolhido', () => {
    const contexto = montar(false);
    const atual = abrirOpcoes(contexto).find((opcao) => texto(opcao) === 'Combate (atual)');

    expect(atual?.getAttribute('aria-disabled')).toBe('true');
    expect(botaoTrocar(contexto.raiz).disabled).toBe(true);
  });

  it('sem combate aberto, emite o tipo escolhido sem confirmar', async () => {
    const contexto = montar(false);
    escolher(contexto, 'Investigação');

    botaoTrocar(contexto.raiz).click();
    await assentar();

    expect(contexto.confirmacaoService.confirmar).not.toHaveBeenCalled();
    expect(contexto.escolhidos).toEqual([CenaTipoEnum.INVESTIGACAO]);
  });

  it('com combate aberto, confirma o encerramento antes de emitir', async () => {
    const contexto = montar(true);
    escolher(contexto, 'Furtiva');

    botaoTrocar(contexto.raiz).click();
    await assentar();

    expect(contexto.confirmacaoService.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Trocar tipo', entidade: 'Sessão 7' }),
    );
    expect(contexto.escolhidos).toEqual([CenaTipoEnum.FURTIVA]);
  });

  it('com combate aberto e confirmação recusada, não emite', async () => {
    const contexto = montar(true, false);
    escolher(contexto, 'Investigação');

    botaoTrocar(contexto.raiz).click();
    await assentar();

    expect(contexto.escolhidos).toEqual([]);
  });
});
