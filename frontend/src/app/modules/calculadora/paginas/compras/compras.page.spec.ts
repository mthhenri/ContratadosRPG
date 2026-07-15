import { TestBed } from '@angular/core/testing';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';

import { ComprasPage } from './compras.page';

/**
 * Prova que a aba Compras liga `shared/regras/compras` ao DOM (nenhuma regra duplicada no
 * front): o resumo, o custo de item/modificação e o custo de amplificador vêm do motor
 * (`calcularResumoCompras`/`calcularStatItem`/custos). Os números conferem com a m1-05.
 */
describe('ComprasPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function montar(modo: 'comprar' | 'vender' = 'comprar') {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [ComprasPage] }).compileComponents();
    const fixture = TestBed.createComponent(ComprasPage);
    // O modo chega por rota → input `modo` (withComponentInputBinding). Nos testes, setInput.
    fixture.componentRef.setInput('modo', modo);
    fixture.detectChanges();
    await fixture.whenStable();
    return {
      fixture,
      componentInstance: fixture.componentInstance,
      raiz: fixture.nativeElement as HTMLElement,
    };
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

  /** Lê o valor de um stat pelo rótulo, procurando em qualquer `.calc-stat` da página. */
  function statPorRotulo(raiz: HTMLElement, rotulo: string): string {
    const alvo = Array.from(raiz.querySelectorAll('.calc-stat')).find(
      (cartao) => cartao.querySelector('.calc-stat__rotulo')?.textContent?.trim() === rotulo,
    );
    return alvo?.querySelector('.calc-stat__valor')?.textContent?.trim() ?? '';
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

    // Abre o painel de modificações ("Modificar") e aplica "Balanceada" (custo padrão $750 em Corpo a Corpo).
    (raiz.querySelector('.compras-modificar') as HTMLButtonElement).click();
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

  // === Modo Venda (m1-20) ===

  it('aba Vendas oculta os cards de Configuração e Resumo (só Compras usa)', async () => {
    const compras = await montar('comprar');
    expect(compras.raiz.querySelector('.compras-resumo')).not.toBeNull();
    expect(compras.raiz.querySelector('.calc-config')).not.toBeNull();

    const vendas = await montar('vender');
    expect(vendas.raiz.querySelector('.compras-resumo')).toBeNull();
    expect(vendas.raiz.querySelector('.calc-config')).toBeNull();
    // O card de Venda (taxa/fragmentos/totais) aparece só em Vendas.
    expect(statPorRotulo(vendas.raiz, 'Total de Venda')).not.toBe('');
  });

  it('aplica a taxa de venda sobre o carrinho pelo motor (50% / 75% / 25%)', async () => {
    const { fixture, raiz } = await montar('vender');

    // Adiciona um item de $500 ao carrinho de venda (mesmo catálogo do modo Comprar).
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();

    // Taxa padrão Normal = 50% → $250.
    expect(statPorRotulo(raiz, 'Valor de Venda dos Itens')).toBe('$250');

    // Check-in = 75% → $375.
    clicarPorTexto(raiz, '.compras-taxa__opcao', 'Check-in');
    fixture.detectChanges();
    expect(statPorRotulo(raiz, 'Valor de Venda dos Itens')).toBe('$375');

    // Fora de patente = 25% → $125.
    clicarPorTexto(raiz, '.compras-taxa__opcao', 'Fora de patente');
    fixture.detectChanges();
    expect(statPorRotulo(raiz, 'Valor de Venda dos Itens')).toBe('$125');
  });

  it('soma fragmentos pela tabela do documento e compõe o total de venda', async () => {
    const { fixture, raiz } = await montar('vender');

    // Um fragmento Construtor de Módulo I = $15.000 (célula do documento).
    const linhaModuloI = Array.from(raiz.querySelectorAll('.compras-fragmentos__linha')).find(
      (linha) => linha.querySelector('.compras-fragmentos__modulo')?.textContent?.trim() === 'Módulo I',
    ) as HTMLElement;
    const botaoAdicionarConstrutor = linhaModuloI.querySelector(
      '[aria-label="Adicionar Construtor Módulo I"]',
    ) as HTMLButtonElement;
    botaoAdicionarConstrutor.click();
    fixture.detectChanges();

    expect(statPorRotulo(raiz, 'Total de Fragmentos')).toBe('$15.000');
    // Sem itens no carrinho, o total de venda = só os fragmentos.
    expect(statPorRotulo(raiz, 'Total de Venda')).toBe('$15.000');

    // Some um item ($500 × 50% = $250) → total combinado $15.250.
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();
    expect(statPorRotulo(raiz, 'Total de Venda')).toBe('$15.250');
  });

  it('carrinho de venda é independente do de compra (não herda nem persiste)', async () => {
    // Compra: adiciona um item; ele persiste no localStorage (m1-11).
    const compra = await montar('comprar');
    adicionarItem(compra.raiz, 'Leve');
    compra.fixture.detectChanges();
    await compra.fixture.whenStable();
    expect(compra.raiz.querySelectorAll('.compras-carrinho-item').length).toBe(1);

    // Vendas (instância separada, como a rota própria): começa vazio, não herda o carrinho de compra.
    const venda = await montar('vender');
    expect(venda.raiz.querySelector('.compras-carrinho-item')).toBeNull();

    // Adiciona ao carrinho de venda; isso não é persistido (só o de compra é).
    adicionarItem(venda.raiz, 'Leve');
    venda.fixture.detectChanges();
    await venda.fixture.whenStable();
    expect(venda.raiz.querySelectorAll('.compras-carrinho-item').length).toBe(1);

    // Remontar em Compras recupera o item de compra do localStorage — intacto, sem o de venda.
    const recompra = await montar('comprar');
    expect(recompra.raiz.querySelectorAll('.compras-carrinho-item').length).toBe(1);
    expect(statResumo(recompra.raiz, 'Gasto Total')).toBe('$500');
  });

  it('Limpar zera taxa e fragmentos da venda (o modo continua vindo da rota)', async () => {
    const { fixture, raiz } = await montar('vender');

    // Muda a taxa e adiciona um fragmento.
    clicarPorTexto(raiz, '.compras-taxa__opcao', 'Check-in');
    const botaoPotV = raiz.querySelector(
      '[aria-label="Adicionar Potencializador Módulo V"]',
    ) as HTMLButtonElement;
    botaoPotV.click();
    fixture.detectChanges();
    expect(statPorRotulo(raiz, 'Total de Fragmentos')).toBe('$500');

    // Limpar em duas etapas.
    const limpar = raiz.querySelector('.ajuda-limpar') as HTMLButtonElement;
    limpar.click();
    fixture.detectChanges();
    limpar.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Segue na aba Vendas (modo vem da rota), mas fragmentos zerados e taxa de volta ao Normal.
    expect(statPorRotulo(raiz, 'Total de Fragmentos')).toBe('$0');
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();
    expect(statPorRotulo(raiz, 'Valor de Venda dos Itens')).toBe('$250');
  });

  // === m3-14: confirmações, dialog de stack, item/mod custom ===

  it('remover a última unidade confirma no próprio X (troca in-place) e só some ao confirmar', async () => {
    const { fixture, raiz } = await montar();
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();
    // O X vira confirmar/cancelar no mesmo lugar (sem crescer a UI).
    (raiz.querySelector('.compras-item-remover .compras-btn--icone') as HTMLButtonElement).click();
    fixture.detectChanges();
    // Item continua no carrinho; agora há um botão de confirmar (accent) no lugar do X.
    expect(raiz.querySelector('.compras-carrinho-item')).not.toBeNull();
    const confirmar = raiz.querySelector(
      '.compras-item-remover .compras-btn--adicionar',
    ) as HTMLButtonElement;
    expect(confirmar).not.toBeNull();
    confirmar.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.compras-carrinho-item')).toBeNull();
  });

  it('remover um stack abre o dialog e remove a quantidade escolhida', async () => {
    const { fixture, componentInstance: pagina } = await montar();
    // Item empilhável (Operacional): adiciona o mesmo três vezes → quantidade 3.
    pagina['categoriaAtiva'].set(ItemCategoriaEnum.OPERACIONAL);
    fixture.detectChanges();
    const empilhavel = pagina['itensCatalogo']()[0];
    pagina['adicionarItem'](empilhavel);
    pagina['adicionarItem'](empilhavel);
    pagina['adicionarItem'](empilhavel);
    fixture.detectChanges();
    expect(pagina['itensCarrinho']()[0].quantidade).toBe(3);
    // Pede remoção → abre o dialog (quantidade > 1); nada removido ainda.
    const uid = pagina['itensCarrinho']()[0].uid;
    pagina['removerItem'](uid);
    expect(pagina['uidRemovendoStack']()).toBe(uid);
    // Remove 2 das 3 unidades.
    pagina['quantidadeRemover'].setValue(2);
    pagina['confirmarRemoverStack']();
    fixture.detectChanges();
    expect(pagina['itensCarrinho']()[0].quantidade).toBe(1);
  });

  it('esvaziar pede confirmação e só limpa ao confirmar', async () => {
    const { fixture, raiz } = await montar();
    adicionarItem(raiz, 'Leve');
    fixture.detectChanges();
    clicarPorTexto(raiz, '.compras-limpar', 'Esvaziar');
    fixture.detectChanges();
    expect(raiz.querySelector('.compras-limpar--perigo')).not.toBeNull();
    expect(raiz.querySelector('.compras-carrinho-item')).not.toBeNull();
    clicarPorTexto(raiz, '.compras-limpar--perigo', 'Confirmar');
    fixture.detectChanges();
    expect(raiz.querySelector('.compras-carrinho-item')).toBeNull();
  });

  it('cria um item custom e o adiciona ao carrinho', async () => {
    const { fixture, raiz, componentInstance: pagina } = await montar();
    pagina['alternarCriarItem']();
    pagina['itemCustomForm'].setValue({
      nome: 'Amuleto',
      categoria: ItemCategoriaEnum.EXOTICOS,
      custo: 300,
      peso: 2,
      descricao: '',
    });
    pagina['confirmarCriarItem']();
    fixture.detectChanges();
    const item = raiz.querySelector('.compras-carrinho-item');
    expect(item?.querySelector('.compras-carrinho-item__nome')?.textContent).toContain('Amuleto');
    expect(statResumo(raiz, 'Gasto Total')).toBe('$300');
  });

  it('aplica uma modificação custom a um item do carrinho', async () => {
    const { fixture, componentInstance: pagina } = await montar();
    // Adiciona "Leve" pela API de catálogo.
    const cartaoLeve = pagina['itensCatalogo']().find((c) => c.item.nome === 'Leve')!;
    pagina['adicionarItem'](cartaoLeve);
    fixture.detectChanges();
    const uid = pagina['itensCarrinho']()[0].uid;
    pagina['alternarCriarMod'](uid);
    pagina['modCustomForm'].setValue({ nome: 'Amaldiçoada', empilhamentos: 2, descricao: '' });
    pagina['confirmarCriarMod'](uid);
    fixture.detectChanges();
    expect(pagina['itensCarrinho']()[0].modsAtivas[0].nome).toBe('Amaldiçoada');
    expect(pagina['itensCarrinho']()[0].modsAtivas[0].empilhamentos).toBe(2);
  });
});
