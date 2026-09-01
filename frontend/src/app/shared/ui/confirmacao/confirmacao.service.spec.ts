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
});
