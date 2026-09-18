import { TestBed } from '@angular/core/testing';

import { ConfirmacaoService } from './confirmacao.service';

/**
 * Prova o serviço de confirmação (ui-15): abre um pedido, resolve a promessa com a resposta do
 * usuário e limpa o estado — mesmo padrão de fila-de-um do `LoadingService`.
 */
describe('ConfirmacaoService', () => {
  function montar() {
    TestBed.resetTestingModule();
    return TestBed.inject(ConfirmacaoService);
  }

  it('confirmar publica o pedido em `pedido()` e ainda não resolve', async () => {
    const servico = montar();
    let resolvido: boolean | undefined;
    servico
      .confirmar({ titulo: 'Excluir ficha', mensagem: 'Excluir Kane?', rotuloConfirmar: 'Confirmar' })
      .then((valor) => (resolvido = valor));

    expect(servico.pedido()).toMatchObject({ titulo: 'Excluir ficha' });
    await Promise.resolve();
    expect(resolvido).toBeUndefined();
  });

  it('responder(true) resolve a promessa com true e limpa o pedido', async () => {
    const servico = montar();
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir Kane?',
      rotuloConfirmar: 'Confirmar',
    });

    servico.responder(true);

    expect(await promessa).toBe(true);
    expect(servico.pedido()).toBeNull();
  });

  it('responder(false) resolve a promessa com false — mesmo caminho de Escape/clique fora', async () => {
    const servico = montar();
    const promessa = servico.confirmar({
      titulo: 'Encerrar combate',
      mensagem: 'Encerrar o combate?',
      rotuloConfirmar: 'Encerrar',
    });

    servico.responder(false);

    expect(await promessa).toBe(false);
    expect(servico.pedido()).toBeNull();
  });

  it('responder sem pedido pendente é inócuo', () => {
    const servico = montar();
    expect(() => servico.responder(true)).not.toThrow();
    expect(servico.pedido()).toBeNull();
  });

  it('com `aoConfirmar`, fica em `carregando` até a promessa resolver e só então fecha/resolve', async () => {
    const servico = montar();
    let liberar!: () => void;
    const aoConfirmar = () => new Promise<void>((resolve) => (liberar = resolve));
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir Kane?',
      rotuloConfirmar: 'Confirmar',
      aoConfirmar,
    });

    const respondida = servico.responder(true);
    await Promise.resolve();
    expect(servico.carregando()).toBe(true);
    expect(servico.pedido()).not.toBeNull();

    liberar();
    await respondida;

    expect(servico.carregando()).toBe(false);
    expect(servico.pedido()).toBeNull();
    expect(await promessa).toBe(true);
  });

  it('com `aoConfirmar` que rejeita, sai de `carregando` mas mantém o pedido aberto', async () => {
    const servico = montar();
    const aoConfirmar = () => Promise.reject(new Error('falhou'));
    const promessa = servico.confirmar({
      titulo: 'Excluir ficha',
      mensagem: 'Excluir Kane?',
      rotuloConfirmar: 'Confirmar',
      aoConfirmar,
    });

    await servico.responder(true);

    expect(servico.carregando()).toBe(false);
    expect(servico.pedido()).not.toBeNull();

    servico.responder(false);
    expect(await promessa).toBe(false);
  });
});
