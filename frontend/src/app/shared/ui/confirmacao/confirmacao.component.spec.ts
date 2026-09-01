import { TestBed } from '@angular/core/testing';

import { Confirmacao } from './confirmacao.component';
import { ConfirmacaoService } from './confirmacao.service';

/**
 * Prova o primitivo de confirmação destrutiva (ui-15): apresenta o pedido pendente sobre
 * `app-modal`, destaca `entidade` em negrito, usa `variante="perigo"` por padrão (severidade
 * ausente = destrutivo) e resolve a promessa nas três saídas (confirmar, cancelar, fechar o modal).
 */
describe('Confirmacao', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Confirmacao] });
    const fixture = TestBed.createComponent(Confirmacao);
    const servico = TestBed.inject(ConfirmacaoService);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, servico };
  }

  it('sem pedido pendente, não renderiza `app-modal`', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('app-modal')).toBeNull();
  });

  it('mostra título, mensagem e destaca a entidade em negrito', () => {
    const { fixture, raiz, servico } = montar();
    servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir Kane? Esta ação não pode ser desfeita.',
      entidade: 'Kane',
      rotuloConfirmar: 'Confirmar exclusão',
    });
    fixture.detectChanges();

    expect(raiz.querySelector('.modal__titulo')?.textContent).toBe('Excluir ficha');
    expect(raiz.querySelector('.confirmacao__mensagem strong')?.textContent).toBe('Kane');
    expect(raiz.querySelector('.confirmacao__mensagem')?.textContent).toContain(
      'não pode ser desfeita',
    );
  });

  it('severidade padrão (ausente) usa variante="perigo" e mostra o ícone de alerta', () => {
    const { fixture, raiz, servico } = montar();
    servico.confirmar({ titulo: 'Excluir campanha', mensagem: 'Excluir?', rotuloConfirmar: 'Confirmar' });
    fixture.detectChanges();

    expect(raiz.querySelector('[modalacoes].botao--perigo')).not.toBeNull();
    expect(raiz.querySelector('.confirmacao__icone')).not.toBeNull();
  });

  it('severidade "padrao" usa variante="primario" e não mostra o ícone de alerta', () => {
    const { fixture, raiz, servico } = montar();
    servico.confirmar({
      titulo: 'Transferir mestre',
      mensagem: 'Transferir?',
      severidade: 'padrao',
      rotuloConfirmar: 'Confirmar',
    });
    fixture.detectChanges();

    expect(raiz.querySelector('[modalacoes].botao--primario')).not.toBeNull();
    expect(raiz.querySelector('.confirmacao__icone')).toBeNull();
  });

  it('confirmar resolve a promessa com true e fecha o diálogo', async () => {
    const { fixture, raiz, servico } = montar();
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir?',
      rotuloConfirmar: 'Confirmar exclusão',
    });
    fixture.detectChanges();

    raiz.querySelector<HTMLButtonElement>('[modalacoes].botao--perigo')?.click();
    fixture.detectChanges();

    expect(await promessa).toBe(true);
    expect(raiz.querySelector('app-modal')).toBeNull();
  });

  it('cancelar resolve a promessa com false', async () => {
    const { fixture, raiz, servico } = montar();
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir?',
      rotuloConfirmar: 'Confirmar exclusão',
    });
    fixture.detectChanges();

    raiz.querySelector<HTMLButtonElement>('[modalacoes].botao--secundario')?.click();
    fixture.detectChanges();

    expect(await promessa).toBe(false);
  });

  it('fechar o modal (Escape/fundo/×) resolve a promessa com false, igual a cancelar', async () => {
    const { fixture, raiz, servico } = montar();
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir?',
      rotuloConfirmar: 'Confirmar exclusão',
    });
    fixture.detectChanges();

    const dialogo = raiz.querySelector('dialog') as HTMLDialogElement;
    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(await promessa).toBe(false);
  });

  it('usa o rótulo de cancelar customizado quando informado', () => {
    const { fixture, raiz, servico } = montar();
    servico.confirmar({
      titulo: 'Encerrar combate',
      mensagem: 'Encerrar?',
      rotuloConfirmar: 'Encerrar',
      rotuloCancelar: 'Continuar combate',
    });
    fixture.detectChanges();

    expect(raiz.querySelector('[modalacoes].botao--secundario')?.textContent?.trim()).toBe(
      'Continuar combate',
    );
  });
});
