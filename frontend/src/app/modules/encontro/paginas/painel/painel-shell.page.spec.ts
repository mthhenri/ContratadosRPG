import { TestBed } from '@angular/core/testing';

import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import {
  CAMPANHA_ID,
  USUARIO_JOGADOR,
  USUARIO_MESTRE,
  encontroAtivo,
  encontroEmMontagem,
  montarPainel,
  texto,
} from './painel-encontro.testing';
import { PainelEncontroShell } from './painel-shell.page';

/**
 * Prova a casca da tela "Iniciativa" (`ui-39`): resolve o papel do usuário e monta a página do
 * mestre ou a do jogador, no molde do `detalhe-shell` da campanha. O que cada página faz é provado
 * no spec dela; aqui só quem monta quem — e que o papel errado nunca dispara o efeito do outro.
 */
describe('PainelEncontroShell', () => {
  const montar = (opcoes: Parameters<typeof montarPainel>[1] = {}) =>
    montarPainel(PainelEncontroShell, { ...opcoes, semServicoDeDados: true });

  it('provê o serviço de dados à árvore da rota e o inicializa com a campanha da rota', () => {
    const { dados, encontroService } = montar();

    expect(dados.campanhaId).toBe(CAMPANHA_ID);
    // Uma só carga para as duas páginas: a casca é o único ponto de fetch.
    expect(encontroService.listarPorCampanha).toHaveBeenCalledTimes(1);
  });

  it('monta a página do mestre para o mestre', () => {
    const elemento = montar({ usuarioId: USUARIO_MESTRE }).fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('app-painel-encontro-mestre')).not.toBeNull();
    expect(elemento.querySelector('app-painel-encontro-jogador')).toBeNull();
    expect(elemento.querySelector('.iniciativa-mestre')).not.toBeNull();
    expect(elemento.querySelector('app-conducao-turno')).not.toBeNull();
  });

  it('monta a página do jogador para quem não é mestre', () => {
    const elemento = montar({ usuarioId: USUARIO_JOGADOR }).fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('app-painel-encontro-jogador')).not.toBeNull();
    expect(elemento.querySelector('app-painel-encontro-mestre')).toBeNull();
    expect(elemento.querySelector('.iniciativa-jogador')).not.toBeNull();
    expect(elemento.querySelector('app-conducao-turno')).toBeNull();
  });

  it('enquanto o papel é desconhecido, monta a do mestre — que já traz o esqueleto da tela', () => {
    const elemento = montar({ usuarioId: USUARIO_JOGADOR, membrosPendentes: true }).fixture
      .nativeElement as HTMLElement;

    expect(elemento.querySelector('app-painel-encontro-mestre')).not.toBeNull();
    expect(elemento.querySelector('app-painel-encontro-jogador')).toBeNull();
    expect(
      elemento.querySelector('.iniciativa-mestre__conteudo')?.getAttribute('aria-label'),
    ).toBe('Carregando o combate');
  });

  it('quando os membros chegam e o usuário é jogador, troca para a página do jogador', () => {
    const { fixture, membrosPendentes$ } = montar({
      usuarioId: USUARIO_JOGADOR,
      membrosPendentes: true,
    });
    const elemento = fixture.nativeElement as HTMLElement;

    membrosPendentes$.next([
      {
        usuarioId: USUARIO_JOGADOR,
        nome: 'Bia',
        papel: 'JOGADOR' as never,
        fichas: [{ id: 200, nome: 'K. Amaral' }] as never,
      },
    ]);
    fixture.detectChanges();

    expect(elemento.querySelector('app-painel-encontro-jogador')).not.toBeNull();
    expect(elemento.querySelector('app-painel-encontro-mestre')).toBeNull();
  });

  it('a troca de turno do broadcast chega às duas páginas pelo mesmo serviço', () => {
    const jogador = montar({ usuarioId: USUARIO_JOGADOR });
    jogador.encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
    jogador.fixture.detectChanges();
    expect(texto(jogador.fixture.nativeElement.querySelector('app-acao-jogador'))).toContain(
      'Sua vez',
    );
    TestBed.resetTestingModule();

    const mestre = montar({ usuarioId: USUARIO_MESTRE });
    mestre.encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
    mestre.fixture.detectChanges();
    expect(texto(mestre.fixture.nativeElement.querySelector('.resumo__nome'))).toBe('K. Amaral');
  });

  describe('o papel errado nunca dispara o efeito do outro', () => {
    it('o chamado de iniciativa não ricocheteia no mestre que o disparou', () => {
      const { fixture, encontroIniciativaPedido$ } = montar({
        estado: encontroEmMontagem,
        usuarioId: USUARIO_MESTRE,
      });
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroIniciativaPedido$.next({ id: 1, campanhaId: CAMPANHA_ID });
      fixture.detectChanges();

      expect(notificarEspiao).not.toHaveBeenCalledWith(
        expect.objectContaining({ resumo: 'Role sua iniciativa' }),
      );
    });

    it('não avisa o mestre quando chega a vez de alguém', () => {
      const { fixture, encontroAlterado$ } = montar({ usuarioId: USUARIO_MESTRE });
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(notificarEspiao).not.toHaveBeenCalledWith(
        expect.objectContaining({ resumo: 'Sua vez!' }),
      );
    });

    it('o mestre nunca entra no fluxo de "rolar a própria" iniciativa', () => {
      const { fixture } = montar({ estado: encontroEmMontagem, usuarioId: USUARIO_MESTRE });
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('app-acao-jogador')).toBeNull();
      expect(
        Array.from(elemento.querySelectorAll('button')).map((botao) => texto(botao)),
      ).not.toContain('Rolar iniciativa');
    });
  });

  it('o encontro encerrado do histórico abre para o jogador só como leitura', () => {
    const { fixture, encontroAlterado$ } = montar({ usuarioId: USUARIO_JOGADOR });
    encontroAlterado$.next({
      encontro: { ...encontroAtivo, status: EncontroStatusEnum.ENCERRADO },
    });
    fixture.detectChanges();

    expect(texto((fixture.nativeElement as HTMLElement).querySelector('app-acao-jogador'))).toContain(
      'Encerrado',
    );
  });
});
