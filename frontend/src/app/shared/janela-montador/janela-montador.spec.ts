import type { PainelFlutuante, PainelFlutuantePosicao } from '../ui/painel-flutuante/painel-flutuante.component';
import { JanelaMontador, MARGEM_JANELA } from './janela-montador';

const OPCOES = {
  largura: 520,
  altura: 700,
  larguraMinima: 360,
  alturaMinima: 440,
  posicaoInicial: { x: 40, y: 136 },
};

const LARGURA_ORIGINAL = window.innerWidth;
const ALTURA_ORIGINAL = window.innerHeight;

function definirViewport(largura: number, altura: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: altura });
}

/** Painel mínimo: só a posição que `JanelaMontador` lê e escreve. */
function painelFalso(posicao: PainelFlutuantePosicao = { x: 300, y: 200 }) {
  const movimentos: { posicao: PainelFlutuantePosicao; persistir: boolean | undefined }[] = [];
  const painel = {
    obterPosicaoAtual: () => posicao,
    moverPara: (destino: PainelFlutuantePosicao, opcoes?: { persistir?: boolean }) => {
      movimentos.push({ posicao: destino, persistir: opcoes?.persistir });
    },
  } as unknown as PainelFlutuante;
  return { painel, movimentos };
}

function ponteiro(x: number, y: number, botao = 0): PointerEvent {
  return { clientX: x, clientY: y, button: botao, preventDefault: () => undefined } as PointerEvent;
}

describe('JanelaMontador', () => {
  afterEach(() => definirViewport(LARGURA_ORIGINAL, ALTURA_ORIGINAL));

  it('em tela alta mantém o tamanho desejado', () => {
    definirViewport(1920, 1080);
    expect(new JanelaMontador(OPCOES).tamanho()).toEqual({ largura: 520, altura: 700 });
  });

  it('no Notebook (1366×768) a altura inicial cabe abaixo da posição inicial, com folga das bordas', () => {
    definirViewport(1366, 768);
    const { altura } = new JanelaMontador(OPCOES).tamanho();
    expect(altura).toBe(768 - 136 - MARGEM_JANELA);
    expect(136 + altura + MARGEM_JANELA).toBeLessThanOrEqual(768);
  });

  it('o piso de altura mínima vale sobre o espaço abaixo da posição inicial', () => {
    definirViewport(1366, 500);
    expect(new JanelaMontador(OPCOES).tamanho().altura).toBe(440);
  });

  it('o tamanho efetivo acompanha o viewport ao encolher e volta ao desejado ao crescer', () => {
    definirViewport(1920, 1080);
    const janela = new JanelaMontador(OPCOES);
    definirViewport(600, 600);
    janela.atualizarViewport();
    // 520 já cabe em 600 − 32; só a altura (700) é limitada.
    expect(janela.tamanho()).toEqual({ largura: 520, altura: 600 - 2 * MARGEM_JANELA });
    definirViewport(1920, 1080);
    janela.atualizarViewport();
    expect(janela.tamanho()).toEqual({ largura: 520, altura: 700 });
  });

  it('redimensionar respeita o mínimo e o espaço entre a janela e a borda', () => {
    definirViewport(1366, 900);
    const janela = new JanelaMontador(OPCOES);
    const { painel } = painelFalso({ x: 300, y: 200 });

    janela.iniciarRedimensionamento(ponteiro(0, 0));
    janela.moverRedimensionamento(ponteiro(-5000, -5000), painel);
    expect(janela.tamanho()).toEqual({ largura: 360, altura: 440 });

    janela.moverRedimensionamento(ponteiro(5000, 5000), painel);
    // viewport − posição: 1366 − 300 = 1066 (limitado ainda pela folga das bordas) e 900 − 200 = 700.
    expect(janela.tamanho().largura).toBe(1066);
    expect(janela.tamanho().altura).toBe(700);

    janela.encerrarRedimensionamento();
    janela.moverRedimensionamento(ponteiro(0, 0), painel);
    expect(janela.tamanho().largura).toBe(1066);
  });

  it('botão que não é o principal não inicia o redimensionamento', () => {
    definirViewport(1920, 1080);
    const janela = new JanelaMontador(OPCOES);
    const { painel } = painelFalso();
    janela.iniciarRedimensionamento(ponteiro(0, 0, 2));
    janela.moverRedimensionamento(ponteiro(100, 100), painel);
    expect(janela.tamanho()).toEqual({ largura: 520, altura: 700 });
  });

  it('maximizar ocupa o viewport, vai a 0,0 sem persistir e bloqueia o redimensionamento', () => {
    definirViewport(1366, 768);
    const janela = new JanelaMontador(OPCOES);
    const { painel, movimentos } = painelFalso({ x: 300, y: 200 });

    janela.alternarMaximizar(painel);
    expect(janela.maximizada()).toBe(true);
    expect(janela.tamanho()).toEqual({ largura: 1366, altura: 768 });
    expect(movimentos).toEqual([{ posicao: { x: 0, y: 0 }, persistir: false }]);

    janela.iniciarRedimensionamento(ponteiro(0, 0));
    janela.moverRedimensionamento(ponteiro(50, 50), painel);
    expect(janela.tamanho()).toEqual({ largura: 1366, altura: 768 });
  });

  it('maximizada acompanha o viewport ao redimensionar a tela', () => {
    definirViewport(1366, 768);
    const janela = new JanelaMontador(OPCOES);
    janela.alternarMaximizar(painelFalso().painel);
    definirViewport(1000, 700);
    janela.atualizarViewport();
    expect(janela.tamanho()).toEqual({ largura: 1000, altura: 700 });
  });

  it('restaurar devolve o tamanho e a posição de antes; fechar maximizada faz o mesmo', () => {
    definirViewport(1920, 1080);
    const janela = new JanelaMontador(OPCOES);
    const { painel, movimentos } = painelFalso({ x: 300, y: 200 });

    janela.alternarMaximizar(painel);
    janela.alternarMaximizar(painel);
    expect(janela.maximizada()).toBe(false);
    expect(janela.tamanho()).toEqual({ largura: 520, altura: 700 });
    expect(movimentos.at(-1)).toEqual({ posicao: { x: 300, y: 200 }, persistir: undefined });

    janela.alternarMaximizar(painel);
    janela.restaurar(painel);
    expect(janela.maximizada()).toBe(false);
    expect(movimentos.at(-1)?.posicao).toEqual({ x: 300, y: 200 });

    const antes = movimentos.length;
    janela.restaurar(painel);
    expect(movimentos).toHaveLength(antes);
  });
});
