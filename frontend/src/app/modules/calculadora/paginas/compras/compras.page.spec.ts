import { TestBed } from '@angular/core/testing';

import { ComprasPage } from './compras.page';

/**
 * Prova que a aba Compras liga `shared/regras/compras` ao DOM (nenhuma regra duplicada no
 * front): o resumo, o custo de item/modificação e o custo de amplificador vêm do motor
 * (`calcularResumoCompras`/`calcularStatItem`/custos). Os números conferem com a m1-05.
 */
describe('ComprasPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function montar() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [ComprasPage] }).compileComponents();
    const fixture = TestBed.createComponent(ComprasPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  function statResumo(raiz: HTMLElement, rotulo: string): string {
    const cartoes = Array.from(raiz.querySelectorAll('.compras-resumo .calc-stat'));
    const alvo = cartoes.find(
      (cartao) => cartao.querySelector('.calc-stat__rotulo')?.textContent?.trim() === rotulo,
    );
    return alvo?.querySelector('.calc-stat__valor')?.textContent?.trim() ?? '';
  }

  function clicarPorTexto(raiz: HTMLElement, seletor: string, texto: string): void {
    const alvo = Array.from(raiz.querySelectorAll(seletor)).find((elemento) =>
      elemento.textContent?.trim().startsWith(texto),
    ) as HTMLButtonElement | undefined;
    alvo?.click();
  }

  /** Clica o botão "+ Adicionar" do cartão de catálogo cujo nome é exatamente `nome`. */
  function adicionarItem(raiz: HTMLElement, nome: string): void {
    const cartao = Array.from(raiz.querySelectorAll('.compras-grade .compras-item')).find(
      (item) => item.querySelector('.compras-item__nome')?.textContent?.trim() === nome,
    );
    (cartao?.querySelector('.compras-btn--adicionar') as HTMLButtonElement | undefined)?.click();
  }

  it('exibe o resumo padrão (Prestígio 0 → Agente, $1.000, carrinho vazio)', async () => {
    const { raiz } = await montar();
    expect(statResumo(raiz, 'Patente')).toBe('Agente');
    expect(statResumo(raiz, 'Dinheiro Restante')).toBe('$1.000');
    expect(statResumo(raiz, 'Gasto Total')).toBe('$0');
    expect(raiz.querySelector('.compras-carrinho-item')).toBeNull();
  });

  it('adiciona um item e recalcula gasto/restante e o stat de dano pelo motor', async () => {
    const { fixture, raiz } = await montar();
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();

    expect(statResumo(raiz, 'Gasto Total')).toBe('$500');
    expect(statResumo(raiz, 'Dinheiro Restante')).toBe('$500');

    const item = raiz.querySelector('.compras-carrinho-item');
    expect(item?.querySelector('.compras-carrinho-item__nome')?.textContent).toContain('Leve');
    expect(item?.querySelector('.compras-carrinho-item__stat')?.textContent).toContain(
      'Dano 1D6+DES [Físico]',
    );
  });

  it('aplica uma modificação e soma o custo do motor ($750) ao gasto', async () => {
    const { fixture, raiz } = await montar();
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();

    // Abre o painel de modificações e aplica "Balanceada" (custo padrão $750 em Corpo a Corpo).
    (raiz.querySelector('.compras-mods-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    const entrada = Array.from(raiz.querySelectorAll('.compras-mod-entrada')).find(
      (elemento) =>
        elemento.querySelector('.compras-mod-entrada__nome')?.textContent?.trim() === 'Balanceada',
    );
    (entrada?.querySelector('.compras-btn--adicionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    // 500 (item) + 750 (mod) = 1.250.
    expect(statResumo(raiz, 'Gasto Total')).toBe('$1.250');
    expect(raiz.querySelector('.compras-mod-tag__info')?.textContent).toContain('Balanceada ×1');
  });

  it('adquire um amplificador ($3.000, 1/3) pelo custo do motor', async () => {
    const { fixture, raiz } = await montar();
    // Vai à categoria de amplificadores e adquire o "Defesa".
    clicarPorTexto(raiz, '.compras-categoria', 'Amplificadores');
    fixture.detectChanges();
    const cartao = Array.from(raiz.querySelectorAll('.compras-grade .compras-item')).find(
      (item) => item.querySelector('.compras-item__nome')?.textContent?.trim() === 'Defesa',
    );
    (cartao?.querySelector('.compras-btn--adicionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(statResumo(raiz, 'Gasto Total')).toBe('$3.000');
    expect(statResumo(raiz, 'Amplificadores')).toBe('1 / 3');
    expect(raiz.querySelector('.compras-amps-carrinho__cabecalho')?.textContent).toContain('1/3');
  });

  it('persiste o carrinho no localStorage e recarrega ao remontar a página (m1-11)', async () => {
    const primeira = await montar();
    adicionarItem(primeira.raiz, 'Leve');
    primeira.fixture.detectChanges();
    await primeira.fixture.whenStable();
    expect(statResumo(primeira.raiz, 'Gasto Total')).toBe('$500');

    const segunda = await montar();
    expect(statResumo(segunda.raiz, 'Gasto Total')).toBe('$500');
    const item = segunda.raiz.querySelector('.compras-carrinho-item');
    expect(item?.querySelector('.compras-carrinho-item__nome')?.textContent).toContain('Leve');
  });

  it('Limpar volta a aba ao estado padrão e descarta o carrinho salvo (m1-19)', async () => {
    const primeira = await montar();
    adicionarItem(primeira.raiz, 'Leve');
    primeira.fixture.detectChanges();
    await primeira.fixture.whenStable();
    expect(statResumo(primeira.raiz, 'Gasto Total')).toBe('$500');

    // Limpar em duas etapas: 1º clique arma "Tem certeza?", 2º confirma.
    const limpar = primeira.raiz.querySelector('.ajuda-limpar') as HTMLButtonElement;
    limpar.click();
    primeira.fixture.detectChanges();
    limpar.click();
    primeira.fixture.detectChanges();
    await primeira.fixture.whenStable();

    // Carrinho vazio e resumo de volta ao padrão (Agente, $1.000, gasto $0).
    expect(primeira.raiz.querySelector('.compras-carrinho-item')).toBeNull();
    expect(statResumo(primeira.raiz, 'Gasto Total')).toBe('$0');
    expect(statResumo(primeira.raiz, 'Dinheiro Restante')).toBe('$1.000');

    // A limpeza foi persistida: remontar a página (recarrega do localStorage) segue no padrão.
    const segunda = await montar();
    expect(segunda.raiz.querySelector('.compras-carrinho-item')).toBeNull();
    expect(statResumo(segunda.raiz, 'Gasto Total')).toBe('$0');
  });

  it('exporta um código e importa em outra instância reproduzindo o mesmo carrinho (m1-11)', async () => {
    const origem = await montar();
    adicionarItem(origem.raiz, 'Leve');
    origem.fixture.detectChanges();

    clicarPorTexto(origem.raiz, '.compras-limpar', 'Exportar');
    origem.fixture.detectChanges();
    const codigo = (
      origem.raiz.querySelector('.compras-modal__codigo[readonly]') as HTMLTextAreaElement
    ).value;
    expect(codigo.startsWith('CRPG-COMPRAS-V1:')).toBe(true);

    localStorage.clear();
    const destino = await montar();
    clicarPorTexto(destino.raiz, '.compras-limpar', 'Importar');
    destino.fixture.detectChanges();
    const textareaImportar = destino.raiz.querySelector(
      '.compras-modal__codigo:not([readonly])',
    ) as HTMLTextAreaElement;
    textareaImportar.value = codigo;
    textareaImportar.dispatchEvent(new Event('input'));
    destino.fixture.detectChanges();
    clicarPorTexto(destino.raiz, '.compras-btn--adicionar', 'Importar');
    destino.fixture.detectChanges();

    expect(statResumo(destino.raiz, 'Gasto Total')).toBe('$500');
    const item = destino.raiz.querySelector('.compras-carrinho-item');
    expect(item?.querySelector('.compras-carrinho-item__nome')?.textContent).toContain('Leve');
  });
});
