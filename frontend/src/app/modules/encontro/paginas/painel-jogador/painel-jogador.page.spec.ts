import { TestBed } from '@angular/core/testing';

import type {
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { EncontroStatusEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import {
  CAMPANHA_ID,
  USUARIO_JOGADOR,
  criarCombatente as combatente,
  encontroAtivo,
  encontroEmMontagem,
  itemDaColuna,
  montarPainel,
  texto,
} from '../painel/painel-encontro.testing';
import { PainelEncontroJogador } from './painel-jogador.page';

/** Um usuário que é jogador da campanha mas não tem ficha em campo neste encontro. */
const USUARIO_SEM_FICHA_EM_CAMPO = 8;

/**
 * Prova a visão do jogador da tela "Iniciativa" (m7-06, redesenhada na `ui-39`): a composição do
 * mestre — coluna de ações, trilha, Rolagens fixas e palco — com a **própria ficha** no palco e as
 * ações dele (rolar a própria iniciativa, avançar o próprio turno) no bloco do topo da trilha. A
 * leitura da ordem da rodada mora no `EncontroPainelDadosService` e é provada no spec dele.
 */
describe('PainelEncontroJogador', () => {
  /** Monta a página do jogador (K. Amaral, combatente 2, é a ficha 200 da Bia). */
  const montar = (
    estado: EncontroRecuperadoDto = encontroAtivo,
    usuarioId: number = USUARIO_JOGADOR,
    historicoExtra: readonly EncontroResumoDto[] = [],
  ) => montarPainel(PainelEncontroJogador, { estado, usuarioId, historicoExtra });

  /** O bloco de ação do topo da trilha. */
  const blocoDeAcao = (raiz: HTMLElement): HTMLElement =>
    raiz.querySelector('app-trilha-turnos app-acao-jogador') as HTMLElement;

  /** Iniciativa ainda por rolar, para K. Amaral (a ficha 200 da Bia). */
  const montagemSemIniciativa: EncontroRecuperadoDto = {
    ...encontroEmMontagem,
    combatentes: [
      combatente(1, 'SCP-1471-A', { tipoFicha: TipoFichaEnum.CRIATURA, iniciativa: null }),
      combatente(2, 'K. Amaral', { fichaId: 200, iniciativa: null }),
    ],
  };

  it('hospeda a bandeja central que apresenta o resultado das rolagens', () => {
    const elemento = montar().fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('app-bandeja-dados')).not.toBeNull();
  });

  describe('casca', () => {
    it('monta a composição do mestre: coluna, trilha, Rolagens fixa e a própria ficha no palco', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('.iniciativa-jogador')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-mestre')).toBeNull();
      expect(elemento.querySelector('.iniciativa-tela')).toBeNull();
      expect(elemento.querySelector('app-coluna-acoes')).not.toBeNull();
      expect(elemento.querySelector('app-trilha-turnos')).not.toBeNull();
      // As rolagens são uma coluna da página, não o painel sobreposto com gatilho.
      expect(elemento.querySelector('.historico-rolagens__painel--fixo')).not.toBeNull();
      expect(elemento.querySelector('.historico-rolagens__gatilho')).toBeNull();
      // O palco é a ficha do jogador — a grade e a barra de condução do mestre não existem aqui.
      expect(elemento.querySelector('.iniciativa-jogador__palco')?.getAttribute('aria-label')).toBe(
        'Minha ficha',
      );
      // Sem cabeçalho de seção: a ficha começa no topo do palco.
      expect(elemento.querySelector('.iniciativa-jogador__palco > .iniciativa-jogador__secao')).toBeNull();
      expect(elemento.querySelector('app-ficha-campanha-card')).not.toBeNull();
      expect(elemento.querySelector('app-cartao-combatente')).toBeNull();
      expect(elemento.querySelector('app-conducao-turno')).toBeNull();
      expect(elemento.querySelector('app-resumo-combatente')).toBeNull();
    });

    it('a coluna de ações só tem Ferramentas: Calculadora e Caderno', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      const rotulos = Array.from(
        elemento.querySelectorAll('app-coluna-acoes .coluna-acoes__item'),
      ).map((item) => texto(item));
      const categorias = Array.from(
        elemento.querySelectorAll('app-coluna-acoes .coluna-acoes__categoria'),
      ).map((categoria) => texto(categoria));

      expect(rotulos).toEqual(['Calculadora', 'Caderno']);
      expect(categorias).toEqual(['Ferramentas']);
    });

    it('com a ficha no palco, sobe as ferramentas para o cabeçalho (recorte mobile) e marca a casca', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const ferramentas = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>(
          '.iniciativa-jogador__cabecalho .iniciativa-jogador__ferramentas button',
        ),
      );

      expect(elemento.querySelector('.iniciativa-jogador')?.classList).toContain(
        'iniciativa-jogador--com-ficha',
      );
      expect(ferramentas.map((botao) => botao.getAttribute('aria-label'))).toEqual([
        'Calculadora',
        'Caderno',
      ]);

      // Os botões do cabeçalho abrem as mesmas janelas da coluna de ações.
      ferramentas[0].click();
      fixture.detectChanges();
      expect(itemDaColuna(elemento, 'Calculadora')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('sem ficha em campo a coluna de ações continua sendo o caminho (a casca não é marcada)', () => {
      const elemento = montar(encontroAtivo, USUARIO_SEM_FICHA_EM_CAMPO).fixture
        .nativeElement as HTMLElement;

      expect(elemento.querySelector('.iniciativa-jogador')?.classList).not.toContain(
        'iniciativa-jogador--com-ficha',
      );
    });

    it('marca Calculadora e Caderno como pressionados enquanto as janelas estão abertas', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;

      for (const rotulo of ['Calculadora', 'Caderno']) {
        const item = itemDaColuna(elemento, rotulo)!;
        expect(item.getAttribute('aria-pressed')).toBe('false');

        item.click();
        fixture.detectChanges();
        expect(item.getAttribute('aria-pressed')).toBe('true');
        expect(item.classList).toContain('coluna-acoes__item--ativo');
      }
    });

    it('descreve o encontro no cabeçalho — título, campanha e estado — sem o chip "Espectador"', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;

      expect(texto(elemento.querySelector('.iniciativa-jogador__titulo'))).toBe(
        'Iniciativa · Contenção no Setor 12',
      );
      expect(texto(elemento.querySelector('.iniciativa-jogador__campanha'))).toBe(
        'Campanha de Teste',
      );
      expect(texto(elemento.querySelector('.iniciativa-jogador__cabecalho app-chip'))).toBe(
        'Em combate',
      );
      expect(elemento.textContent).not.toContain('Espectador');
    });

    it('não dá controles do mestre nem o histórico de encontros', () => {
      const encerrado: EncontroResumoDto = {
        id: 2,
        campanhaId: CAMPANHA_ID,
        nome: 'Emboscada no Setor 4',
        status: EncontroStatusEnum.ENCERRADO,
        rodadaAtual: 5,
        quantidadeCombatentes: 3,
        createdDate: '2026-08-10T12:00:00.000Z',
      };
      const elemento = montar(encontroAtivo, USUARIO_JOGADOR, [encerrado]).fixture
        .nativeElement as HTMLElement;
      const textos = Array.from(elemento.querySelectorAll('button')).map((botao) => texto(botao));

      for (const proibido of [
        'Avançar',
        'Voltar',
        'Encerrar',
        'Rolar iniciativas',
        'Selecionar combatentes',
        'Adicionar avulso',
      ]) {
        expect(textos).not.toContain(proibido);
      }
      expect(elemento.querySelectorAll('.combatente__stepper')).toHaveLength(0);
      expect(elemento.querySelector('.historico__menu')).toBeNull();
      expect(elemento.querySelector('.historico__card')).toBeNull();
      expect(
        Array.from(elemento.querySelectorAll('.iniciativa-jogador__cabecalho button')).some(
          (botao) => texto(botao).includes('encerrado'),
        ),
      ).toBe(false);
    });

    it('mostra a silhueta enquanto carrega, sem cair no estado vazio', () => {
      const { fixture, dados } = montar();
      (dados as unknown as { carregandoEncontro: { set(v: boolean): void } }).carregandoEncontro.set(
        true,
      );
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;

      expect(
        elemento.querySelector('.iniciativa-jogador__linha')?.getAttribute('aria-label'),
      ).toBe('Carregando o combate');
      // Trilha (com o bloco de ação), Rolagens e as duas massas da ficha — a silhueta da tela pronta.
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-trilha')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-acao')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-rolagens')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-identidade')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-conteudo')).not.toBeNull();
      // A coluna de ações e o cabeçalho são os reais: não dependem do encontro.
      expect(elemento.querySelectorAll('app-coluna-acoes .coluna-acoes__item')).toHaveLength(2);
      expect(elemento.querySelector('.iniciativa-jogador__vazio')).toBeNull();
      expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
    });

    it('com a lista de encontros já na tela e o encontro em voo, segue na silhueta', () => {
      const { fixture, encontroPendente$ } = montarPainel(PainelEncontroJogador, {
        usuarioId: USUARIO_JOGADOR,
        encontroPendente: true,
      });
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-trilha')).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__vazio')).toBeNull();

      encontroPendente$.next(encontroAtivo);
      encontroPendente$.complete();
      fixture.detectChanges();

      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-trilha')).toBeNull();
      expect(elemento.querySelector('app-trilha-turnos')).not.toBeNull();
    });

    it('sem combate aberto, mantém a casca e o palco vira um estado vazio', () => {
      const soEncerrado: EncontroRecuperadoDto = {
        ...encontroAtivo,
        status: EncontroStatusEnum.ENCERRADO,
      };
      const elemento = montar(soEncerrado).fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('app-coluna-acoes')).not.toBeNull();
      expect(texto(elemento.querySelector('.iniciativa-jogador__titulo'))).toBe('Iniciativa');
      expect(elemento.querySelector('.iniciativa-jogador__cabecalho app-chip')).toBeNull();
      expect(texto(elemento.querySelector('.iniciativa-jogador__vazio'))).toContain(
        'Nenhum combate em andamento.',
      );
      expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
    });
  });

  describe('a própria ficha no palco', () => {
    it('busca o documento completo da própria ficha e o entrega ao cartão de ficha', () => {
      const { fixture, fichaService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;

      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(200);
      const cartao = elemento.querySelector('app-ficha-campanha-card');
      expect(cartao).not.toBeNull();
      expect(elemento.querySelector('.iniciativa-jogador__esqueleto-ficha')).toBeNull();
      // O cartão dispensa a faixa própria "Ficha de Jogador · FICHA-JGD-NNNN".
      expect(cartao?.querySelector('.ficha-visao__topo')).toBeNull();
    });

    it('mostra a silhueta da ficha enquanto o documento não chega', () => {
      const { fixture } = montar();
      (
        fixture.componentInstance as unknown as { meuFichaDados: { set(v: null): void } }
      ).meuFichaDados.set(null);
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('app-ficha-campanha-card')).toBeNull();
      expect(
        elemento.querySelector('.iniciativa-jogador__esqueleto-ficha')?.getAttribute('aria-label'),
      ).toBe('Carregando sua ficha');
    });
  });

  describe('a trilha e o bloco de ação', () => {
    it('marca o próprio combatente na trilha com "Você"', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      const meu = elemento.querySelector('app-trilha-turnos .trilha__item--voce');

      expect(meu).not.toBeNull();
      expect(texto(meu)).toContain('K. Amaral');
      expect(texto(meu?.querySelector('.trilha__sub'))).toBe('Você');
      expect(texto(meu?.querySelector('.trilha__iniciativa'))).toBe('18');
      expect(elemento.querySelectorAll('.trilha__item--voce')).toHaveLength(1);
    });

    it('vez de outro: diz quem age agora e quantos turnos faltam até a sua vez', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      const bloco = blocoDeAcao(elemento);

      // Slot 2 é da criatura; o de K. Amaral é o 1 — três turnos depois, na rodada seguinte.
      expect(texto(bloco)).toContain('Age agora');
      expect(texto(bloco)).toContain('SCP-1471-A');
      expect(texto(bloco)).toContain('Faltam 3 turnos para a sua vez.');
      expect(bloco.querySelector('button')).toBeNull();
      expect(bloco.classList).not.toContain('acao--acesa');
    });

    it('avisa quando o jogador é o próximo', () => {
      const { fixture, encontroAlterado$ } = montar();
      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 0 } });
      fixture.detectChanges();

      expect(texto(blocoDeAcao(fixture.nativeElement))).toContain('Você é o próximo.');
    });

    it('mostra e executa o avanço somente quando chega a vez do próprio jogador', () => {
      const { fixture, encontroAlterado$, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      expect(blocoDeAcao(elemento).querySelector('button')).toBeNull();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      const bloco = blocoDeAcao(elemento);
      expect(texto(bloco)).toContain('Sua vez');
      expect(texto(bloco)).toContain('K. Amaral');
      expect(texto(bloco)).toContain('1 ação restante');
      expect(bloco.classList).toContain('acao--acesa');
      const botao = bloco.querySelector<HTMLButtonElement>('button');
      expect(texto(botao)).toBe('Avançar turno');

      botao?.click();
      expect(encontroService.avancarTurno).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('em montagem, sem iniciativa, oferece "Rolar iniciativa" no bloco da trilha', () => {
      const elemento = montar(montagemSemIniciativa).fixture.nativeElement as HTMLElement;
      const bloco = blocoDeAcao(elemento);

      expect(texto(bloco)).toContain('Sua iniciativa');
      expect(texto(bloco.querySelector('button'))).toBe('Rolar iniciativa');
      // Sem o chamado do mestre a moldura não acende.
      expect(bloco.classList).not.toContain('acao--acesa');
      // E o "Você" da trilha ainda está lá, sem número.
      expect(texto(elemento.querySelector('.trilha__item--voce .trilha__iniciativa'))).toBe('—');
    });

    it('em montagem, já com iniciativa, aguarda o mestre começar', () => {
      const elemento = montar(encontroEmMontagem).fixture.nativeElement as HTMLElement;
      const bloco = blocoDeAcao(elemento);

      expect(texto(bloco)).toContain('Aguardando');
      expect(texto(bloco)).toContain('Iniciativa 18');
      expect(bloco.querySelector('button')).toBeNull();
    });

    it('encerrado: só o estado, sem botões nem avanço', () => {
      const { fixture, encontroAlterado$ } = montar();
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, turnoIndice: 1, status: EncontroStatusEnum.ENCERRADO },
      });
      fixture.detectChanges();
      const bloco = blocoDeAcao(fixture.nativeElement);

      expect(texto(bloco)).toContain('Encerrado');
      expect(bloco.querySelector('button')).toBeNull();
    });
  });

  describe('rolar a própria iniciativa', () => {
    it('o jogador rola a **própria** iniciativa pelo preset da ficha dele', () => {
      const { fixture, encontroService } = montar(montagemSemIniciativa);
      const elemento = fixture.nativeElement as HTMLElement;
      const painel = fixture.componentInstance as unknown as {
        possoRolarIniciativa: () => boolean;
        meuCombatente: () => { id: number } | null;
      };

      // A ficha 200 é da Bia (USUARIO_JOGADOR) — só o combatente dela entra em jogo.
      expect(painel.meuCombatente()?.id).toBe(2);
      expect(painel.possoRolarIniciativa()).toBe(true);

      blocoDeAcao(elemento).querySelector<HTMLButtonElement>('button')?.click();

      expect(encontroService.atribuirIniciativa).toHaveBeenCalledTimes(1);
      const [dto] = encontroService.atribuirIniciativa.mock.calls[0] as unknown as [
        { id: number; iniciativa: number },
      ];
      expect(dto.id).toBe(2);
      // Preset "Iniciativa" = DESd6 com Destreza 4 → 4d6, entre 4 e 24.
      expect(dto.iniciativa).toBeGreaterThanOrEqual(4);
      expect(dto.iniciativa).toBeLessThanOrEqual(24);
    });

    it('m7-19: a expressão customizada do próprio combatente sobrescreve o preset da ficha', () => {
      const comFormulaCustom: EncontroRecuperadoDto = {
        ...montagemSemIniciativa,
        combatentes: [
          montagemSemIniciativa.combatentes[0],
          { ...montagemSemIniciativa.combatentes[1], iniciativaFormulaCustom: '1' },
        ],
      };
      const { fixture, encontroService, fichaService } = montar(comFormulaCustom);
      // A ficha do palco já busca a própria ficha ao montar a tela — a chamada que importa aqui é
      // a que `rolarMinhaIniciativa` faria por conta própria, então a prova é "não ganhou uma
      // chamada a mais", não "nunca foi chamada".
      const chamadasAntes = fichaService.recuperarFicha.mock.calls.length;

      blocoDeAcao(fixture.nativeElement).querySelector<HTMLButtonElement>('button')?.click();

      // Fórmula fixa "1" — impossível pelo preset padrão (DESd6 com Destreza 4, mínimo 4) —, prova
      // que a sobrescrita venceu sem buscar a ficha de novo.
      expect(fichaService.recuperarFicha.mock.calls.length).toBe(chamadasAntes);
      expect(encontroService.atribuirIniciativa).toHaveBeenCalledWith({ id: 2, iniciativa: 1 });
    });

    it('acende o chamado do mestre no bloco de ação e avisa com uma notificação', () => {
      const { fixture, encontroIniciativaPedido$ } = montar(montagemSemIniciativa);
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroIniciativaPedido$.next({ id: 1, campanhaId: CAMPANHA_ID });
      fixture.detectChanges();

      const painel = fixture.componentInstance as unknown as { iniciativaPedida: () => boolean };
      expect(painel.iniciativaPedida()).toBe(true);
      expect(blocoDeAcao(fixture.nativeElement).classList).toContain('acao--acesa');
      expect(texto(blocoDeAcao(fixture.nativeElement))).toContain('O mestre chamou a rolagem');
      expect(notificarEspiao).toHaveBeenCalledWith(
        expect.objectContaining({ severidade: 'informacao', resumo: 'Role sua iniciativa' }),
      );
    });

    it('ignora o chamado de outra campanha', () => {
      const { fixture, encontroIniciativaPedido$ } = montar(montagemSemIniciativa);
      encontroIniciativaPedido$.next({ id: 1, campanhaId: 999 });

      const painel = fixture.componentInstance as unknown as { iniciativaPedida: () => boolean };
      expect(painel.iniciativaPedida()).toBe(false);
    });

    it('depois de rolar, o chamado apaga', () => {
      const { fixture, encontroIniciativaPedido$ } = montar(montagemSemIniciativa);
      encontroIniciativaPedido$.next({ id: 1, campanhaId: CAMPANHA_ID });
      fixture.detectChanges();

      blocoDeAcao(fixture.nativeElement).querySelector<HTMLButtonElement>('button')?.click();
      fixture.detectChanges();

      const painel = fixture.componentInstance as unknown as { iniciativaPedida: () => boolean };
      expect(painel.iniciativaPedida()).toBe(false);
    });
  });

  describe('aviso da própria vez', () => {
    it('avisa o jogador com uma notificação quando chega a vez do combatente dele', () => {
      const { fixture, encontroAlterado$ } = montar();
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      // Slot 1 da `ordemRodada` de `encontroAtivo` é o combatenteId 2 — K. Amaral, ficha da Bia.
      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(notificarEspiao).toHaveBeenCalledWith(
        expect.objectContaining({ severidade: 'informacao', resumo: 'Sua vez!' }),
      );
    });

    it('não repete a notificação de "sua vez" a cada broadcast — só quando o slot muda de fato', () => {
      const { fixture, encontroAlterado$ } = montar();
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();
      expect(notificarEspiao).toHaveBeenCalledTimes(1);

      // Outro broadcast qualquer, mesmo slot (ex.: alguém tomou dano) — não deve reavisar.
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, turnoIndice: 1, nome: 'Contenção no Setor 12 (dano)' },
      });
      fixture.detectChanges();
      expect(notificarEspiao).toHaveBeenCalledTimes(1);
    });
  });

  describe('sem combatente com ficha em campo (só assiste)', () => {
    const assistindo = () => montar(encontroAtivo, USUARIO_SEM_FICHA_EM_CAMPO);

    it('o palco é a grade de leitura dos combatentes, sem controles', () => {
      const elemento = assistindo().fixture.nativeElement as HTMLElement;
      const grade = elemento.querySelector<HTMLElement>('.grade');

      expect(grade?.classList).toContain('grade--compacta');
      expect(grade?.classList).toContain('grade--palco');
      expect(elemento.querySelectorAll('app-cartao-combatente')).toHaveLength(4);
      expect(elemento.querySelectorAll('.combatente__stepper')).toHaveLength(0);
      expect(texto(elemento.querySelector('.iniciativa-jogador__secao-titulo'))).toBe(
        'Todos os combatentes',
      );
      expect(texto(elemento.querySelector('.iniciativa-jogador__secao-meta'))).toContain(
        '3 participantes',
      );
      expect(elemento.querySelector('app-ficha-campanha-card')).toBeNull();
    });

    it('o bloco de ação diz que está assistindo e quem age agora', () => {
      const elemento = assistindo().fixture.nativeElement as HTMLElement;
      const bloco = blocoDeAcao(elemento);

      expect(texto(bloco)).toContain('Age agora');
      expect(texto(bloco)).toContain('SCP-1471-A');
      expect(texto(bloco)).toContain('Você está assistindo a este combate.');
      expect(bloco.querySelector('button')).toBeNull();
      expect(elemento.querySelector('.trilha__item--voce')).toBeNull();
    });

    it('sem combatentes, o palco explica que o mestre está montando a ordem', () => {
      const vazio: EncontroRecuperadoDto = { ...encontroEmMontagem, combatentes: [] };
      const elemento = montar(vazio, USUARIO_SEM_FICHA_EM_CAMPO).fixture
        .nativeElement as HTMLElement;

      expect(texto(elemento)).toContain('O mestre ainda está montando a ordem de iniciativa.');
      expect(texto(blocoDeAcao(elemento))).toContain('Assistindo');
    });
  });

  it('nunca entra no fluxo do mestre: sem coluna de Combate, sem "Rolar iniciativas"', () => {
    const elemento = montar(montagemSemIniciativa, USUARIO_JOGADOR).fixture
      .nativeElement as HTMLElement;
    const textos = Array.from(elemento.querySelectorAll('button')).map((botao) => texto(botao));

    expect(textos).not.toContain('Rolar iniciativas');
    expect(textos).not.toContain('Iniciar combate');
    expect(itemDaColuna(elemento, 'Novo combate')).toBeUndefined();
  });

});
