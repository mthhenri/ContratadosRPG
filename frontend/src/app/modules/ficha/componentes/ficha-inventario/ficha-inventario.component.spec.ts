import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaFragmentoConsumidoDto,
  FichaInventarioDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaInventario } from './ficha-inventario.component';

/**
 * Prova o editor no próprio lugar da aba Inventário (m3-14): adicionar/editar/remover itens (com
 * modificações) e amplificadores, **reusando `shared/regras/compras`** (catálogo, limites, custos).
 * Controlado — cada mutação emite o `FichaInventarioDto` **inteiro** por `inventarioMudou`; o peso é
 * referência (não trava). Sem cálculo próprio de custo/peso/limite (proibição #26).
 */
describe('FichaInventario', () => {
  const itemLeve: CarrinhoItemDto = {
    nome: 'Leve',
    categoria: ItemCategoriaEnum.CORPO_A_CORPO,
    custo: 500,
    peso: 1,
    quantidade: 1,
    guardada: false,
    modificacoes: [],
  };

  const itemCustom: CarrinhoItemDto = {
    nome: 'Amuleto Caseiro',
    categoria: ItemCategoriaEnum.EXOTICOS,
    custo: 300,
    peso: 2,
    quantidade: 1,
    guardada: false,
    modificacoes: [],
    descricao: 'Brilha no escuro',
  };

  const atributos: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 3,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 3,
  };

  function montar(
    inventario: FichaInventarioDto,
    editavel = true,
    prestigio = 100,
    podeRolar = true,
    possuiAnomalia = false,
    podeMandarParaBase = false,
  ) {
    TestBed.configureTestingModule({ imports: [FichaInventario] });
    const fixture = TestBed.createComponent(FichaInventario);
    fixture.componentRef.setInput('inventario', inventario);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.componentRef.setInput('podeRolar', podeRolar);
    fixture.componentRef.setInput('prestigio', prestigio);
    fixture.componentRef.setInput('inventarioMaximo', 25);
    fixture.componentRef.setInput('vontade', 3);
    fixture.componentRef.setInput('dinheiro', 5000);
    fixture.componentRef.setInput('energiaAtual', 50);
    fixture.componentRef.setInput('energiaMaxima', 50);
    fixture.componentRef.setInput('atributos', atributos);
    fixture.componentRef.setInput('possuiAnomalia', possuiAnomalia);
    fixture.componentRef.setInput('podeMandarParaBase', podeMandarParaBase);
    fixture.detectChanges();
    const emitidos: FichaInventarioDto[] = [];
    fixture.componentInstance.inventarioMudou.subscribe((e) => emitidos.push(e));
    const bandeja = TestBed.inject(BandejaDadosService);
    const mostrar = vi.spyOn(bandeja, 'mostrar').mockImplementation(() => 1);
    return {
      fixture,
      componentInstance: fixture.componentInstance,
      raiz: fixture.nativeElement as HTMLElement,
      emitidos,
      mostrar,
    };
  }

  it('oferece mandar item não equipado para a base quando habilitado', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] }, true, 100, true, false, true);
    const botao = Array.from(alvo.raiz.querySelectorAll('button'))
      .find((elemento) => elemento.textContent?.includes('Mandar pra base'));
    expect(botao).toBeTruthy();
  });

  it('emite imediatamente a transferência integral de item unitário', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] }, true, 100, true, false, true);
    const transferencias: { indice: number; quantidade?: number }[] = [];
    alvo.componentInstance.mandarParaBase.subscribe((evento) => transferencias.push(evento));
    alvo.componentInstance['abrirMandarParaBase'](0);
    expect(transferencias).toEqual([{ indice: 0 }]);
  });

  it('pede quantidade antes de mandar parcialmente um item empilhado', () => {
    const empilhado = { ...itemLeve, quantidade: 3 };
    const alvo = montar({ itens: [empilhado], amplificadores: [] }, true, 100, true, false, true);
    const transferencias: { indice: number; quantidade?: number }[] = [];
    alvo.componentInstance.mandarParaBase.subscribe((evento) => transferencias.push(evento));
    alvo.componentInstance['abrirMandarParaBase'](0);
    alvo.fixture.detectChanges();
    expect(transferencias).toEqual([]);
    expect(alvo.raiz.textContent).toContain('Mandar para a base');
    alvo.componentInstance['quantidadeMandarParaBase'].setValue(2);
    alvo.componentInstance['confirmarMandarParaBase']();
    expect(transferencias).toEqual([{ indice: 0, quantidade: 2 }]);
  });

  it('não oferece mandar item equipado para a base', () => {
    const equipado = { ...itemLeve, equipado: true };
    const alvo = montar({ itens: [equipado], amplificadores: [] }, true, 100, true, false, true);
    expect(alvo.raiz.textContent).not.toContain('Mandar pra base');
  });

  it('consome a cena de uma munição sem ultrapassar zero', () => {
    const municao: CarrinhoItemDto = {
      nome: '9mm', categoria: ItemCategoriaEnum.MUNICOES, custo: 100, peso: 0.5,
      quantidade: 1, guardada: false, modificacoes: [], contagemMunicao: { atual: 1, maxima: 3, unidade: 'CENA' },
    };
    const alvo = montar({ itens: [municao], amplificadores: [] });
    alvo.componentInstance['consumirMunicao'](0);
    alvo.componentInstance['consumirMunicao'](0);
    expect(alvo.emitidos.at(-1)?.itens[0].contagemMunicao).toEqual({ atual: 0, maxima: 3, unidade: 'CENA' });
  });

  it('não oferece "Modificar" em itens Operacional/Medicinal (consumíveis)', () => {
    const operacional: CarrinhoItemDto = {
      nome: 'Kit Médico',
      categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 100,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    const { raiz } = montar({ itens: [operacional, itemLeve], amplificadores: [] }, true);
    const modificares = raiz.querySelectorAll('.ficha-inv__modificar');
    // Só o item "Leve" (Corpo a Corpo) tem "Modificar"; o consumível não.
    expect(modificares.length).toBe(1);
  });

  it('oferece editar informações somente para item custom editável', () => {
    const { raiz } = montar({ itens: [itemCustom, itemLeve], amplificadores: [] });

    expect(raiz.querySelector('[aria-label="Editar informações Amuleto Caseiro"]')).toBeTruthy();
    expect(raiz.querySelector('[aria-label="Editar informações Leve"]')).toBeNull();
  });

  it('abre uma dialog real com o formulário de criação pré-preenchido para o item custom', () => {
    const alvo = montar({ itens: [itemCustom], amplificadores: [] });
    const botao = alvo.raiz.querySelector(
      '[aria-label="Editar informações Amuleto Caseiro"]',
    ) as HTMLButtonElement;

    botao.click();
    alvo.fixture.detectChanges();

    const dialogo = alvo.raiz.querySelector('.p-dialog') as HTMLElement;
    expect(dialogo).toBeTruthy();
    expect(dialogo.textContent).toContain('Editar item custom');
    expect(alvo.raiz.querySelector('.ficha-inv__form--edicao')).toBeNull();
    expect((dialogo.querySelector('[formControlName="nome"]') as HTMLInputElement).value).toBe('Amuleto Caseiro');
    expect((dialogo.querySelector('[formControlName="descricao"]') as HTMLTextAreaElement).value).toBe('Brilha no escuro');
    expect((dialogo.querySelector('[formControlName="custo"]') as HTMLInputElement).value).toBe('300');
    expect((dialogo.querySelector('[formControlName="peso"]') as HTMLInputElement).value).toBe('2');
    expect((dialogo.querySelector('.ficha-inv__categoria-select-gatilho') as HTMLButtonElement).disabled).toBe(true);
  });

  it('salva custo e peso sem negativos e remove a descrição esvaziada sem tocar nos demais campos', () => {
    const itemComCamposMecanicos: CarrinhoItemDto = {
      ...itemCustom,
      dano: '2D6 [Físico]',
      informacao: 'Curto',
      categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      quantidade: 3,
    };
    const alvo = montar({ itens: [itemComCamposMecanicos], amplificadores: [] });
    (alvo.raiz.querySelector(
      '[aria-label="Editar informações Amuleto Caseiro"]',
    ) as HTMLButtonElement).click();
    alvo.fixture.detectChanges();
    const dialogo = alvo.raiz.querySelector('.p-dialog') as HTMLElement;
    const nome = dialogo.querySelector('[formControlName="nome"]') as HTMLInputElement;
    nome.value = '  Amuleto Revisado  ';
    nome.dispatchEvent(new Event('input'));
    alvo.componentInstance['itemCustomForm'].patchValue({ descricao: '   ', custo: -20, peso: -1 });
    (dialogo.querySelector('.ficha-inv__form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { cancelable: true }));

    const { descricao: descricaoRemovida, ...itemSemDescricao } = itemComCamposMecanicos;
    void descricaoRemovida;
    expect(alvo.emitidos).toEqual([{
      itens: [{
        ...itemSemDescricao,
        nome: 'Amuleto Revisado',
        custo: 0,
        peso: 0,
      }],
      amplificadores: [],
    }]);
    expect(alvo.emitidos[0].itens[0]).not.toHaveProperty('descricao');
  });

  it('não oferece "Modificar" num Fragmento Potencializador solto — só "Aplicar em..."/"Consumir" (doc: só o Construtor recebe modificação como a arma base)', () => {
    const potencializador: CarrinhoItemDto = {
      nome: 'Fragmento achado',
      categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
      custo: 0,
      peso: 0,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      modulo: FragmentoModuloEnum.V,
    };
    const { raiz } = montar({ itens: [potencializador, itemLeve], amplificadores: [] }, true);
    const botoesModificar = Array.from(raiz.querySelectorAll('.ficha-inv__modificar')).filter((b) =>
      b.getAttribute('aria-label')?.startsWith('Modificar '),
    );
    // Só o item "Leve" tem "Modificar"; o Potencializador só oferece "Aplicar em..."/"Consumir".
    expect(botoesModificar).toHaveLength(1);
    expect(botoesModificar[0].getAttribute('aria-label')).toBe('Modificar Leve');
    expect(raiz.querySelector('[aria-label^="Aplicar em..."]')).toBeTruthy();
    expect(raiz.querySelector('[aria-label^="Consumir —"]')).toBeTruthy();
  });

  it('um Fragmento Construtor continua modificável — recebe modificações como a própria arma base (m3-65)', () => {
    const construtor: CarrinhoItemDto = {
      nome: 'Espada de Ossos',
      categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      custo: 0,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modulo: FragmentoModuloEnum.V,
      categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      modificacoes: [],
    };
    const { raiz } = montar({ itens: [construtor], amplificadores: [] }, true);
    expect(raiz.querySelector('[aria-label^="Modificar "]')).toBeTruthy();
  });

  it('é só leitura quando não editável: lista os itens sem botões de ação nem catálogo', () => {
    const { raiz } = montar({ itens: [itemLeve], amplificadores: [] }, false);
    const nomes = Array.from(raiz.querySelectorAll('.ficha-inv__item-nome')).map((n) =>
      n.textContent?.trim(),
    );
    expect(nomes).toEqual(['Leve']);
    expect(raiz.querySelector('.ficha-inv__acoes')).toBeNull();
    expect(raiz.querySelector('.ficha-inv__catalogo')).toBeNull();
    expect(raiz.querySelector('.ficha-inv__btn--icone')).toBeNull();
  });

  it('adiciona um item do catálogo e emite o inventário com o novo item', () => {
    const alvo = montar({ itens: [], amplificadores: [] });
    const cartao = alvo.fixture.componentInstance['itensCatalogo']().find(
      (c) => c.item.nome === 'Leve',
    )!;
    alvo.fixture.componentInstance['adicionarItem'](cartao);

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0].itens).toEqual([itemLeve]);
    expect(alvo.emitidos[0].amplificadores).toEqual([]);
  });

  it('mostra a Maestria de Vigor na Proteção guardada e no catálogo de adição', () => {
    const colete: CarrinhoItemDto = {
      nome: 'Colete de Kevlar',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 400,
      peso: 2,
      quantidade: 1,
      guardada: false,
      equipado: true,
      modificacoes: [],
    };
    const alvo = montar({ itens: [colete], amplificadores: [] });
    alvo.fixture.componentRef.setInput('atributos', { ...atributos, vigor: 6 });
    alvo.fixture.componentRef.setInput('maestria', 'vigor');
    alvo.componentInstance['definirCategoria'](ItemCategoriaEnum.PROTECOES);
    alvo.componentInstance['alternarCatalogo']();
    alvo.fixture.detectChanges();

    const estatisticas = Array.from(alvo.raiz.querySelectorAll('.ficha-inv__item-stat, .ficha-inv__cartao-stat')).map(
      (elemento) => elemento.textContent?.trim(),
    );
    expect(estatisticas.filter((texto) => texto?.includes('9 [Balístico]'))).toHaveLength(2);
  });

  it('empilha a quantidade ao adicionar item de categoria empilhável já presente', () => {
    const operacional: CarrinhoItemDto = {
      nome: 'Kit de Ferramentas',
      categoria: ItemCategoriaEnum.OPERACIONAL,
      custo: 100,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    const alvo = montar({ itens: [operacional], amplificadores: [] });
    alvo.fixture.componentInstance['categoriaAtiva'].set(ItemCategoriaEnum.OPERACIONAL);
    const cartao = alvo.fixture.componentInstance['itensCatalogo']().find(
      (c) => c.item.nome === 'Kit de Ferramentas',
    );
    // Só roda a asserção de empilhamento se o item existir no catálogo desta categoria.
    if (cartao) {
      alvo.fixture.componentInstance['adicionarItem'](cartao);
      expect(alvo.emitidos[0].itens[0].quantidade).toBe(2);
    }
  });

  it('aplica uma modificação a um item e a emite dentro do item (custo/limite vêm do motor)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    // "Balanceada" é uma modificação de Corpo a Corpo (empilhamentos iniciais 1).
    alvo.fixture.componentInstance['adicionarModificacao'](0, 'Balanceada');

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0].itens[0].modificacoes).toEqual([{ nome: 'Balanceada', empilhamentos: 1 }]);
  });

  it('remover a última unidade pede confirmação inline e só emite ao confirmar', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.fixture.componentInstance['removerItem'](0);
    // Apenas abriu a confirmação — nada emitido ainda.
    expect(alvo.componentInstance['indiceConfirmandoRemocao']()).toBe(0);
    expect(alvo.emitidos).toHaveLength(0);
    alvo.componentInstance['confirmarRemocaoItem'](0);
    expect(alvo.emitidos[0].itens).toEqual([]);
  });

  it('remover um stack abre o dialog e remove a quantidade escolhida', () => {
    const alvo = montar({ itens: [{ ...itemLeve, quantidade: 3 }], amplificadores: [] });
    alvo.fixture.componentInstance['removerItem'](0);
    expect(alvo.componentInstance['indiceRemovendoStack']()).toBe(0);
    expect(alvo.emitidos).toHaveLength(0);
    alvo.componentInstance['quantidadeRemover'].setValue(2);
    alvo.componentInstance['confirmarRemoverStack']();
    expect(alvo.emitidos[0].itens[0].quantidade).toBe(1);
  });

  it('remover o stack inteiro (quantidade escolhida = total) tira o item da lista', () => {
    const alvo = montar({ itens: [{ ...itemLeve, quantidade: 2 }], amplificadores: [] });
    alvo.fixture.componentInstance['removerItem'](0);
    alvo.componentInstance['quantidadeRemover'].setValue(2);
    alvo.componentInstance['confirmarRemoverStack']();
    expect(alvo.emitidos[0].itens).toEqual([]);
  });

  it('esvaziar pede confirmação e só emite o inventário vazio ao confirmar', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.fixture.componentInstance['esvaziar']();
    expect(alvo.componentInstance['confirmandoEsvaziar']()).toBe(true);
    expect(alvo.emitidos).toHaveLength(0);
    alvo.componentInstance['confirmarEsvaziar']();
    expect(alvo.emitidos[0]).toEqual({ itens: [], amplificadores: [] });
  });

  it('cria um item custom com nome/categoria/custo/peso e o adiciona', () => {
    const alvo = montar({ itens: [], amplificadores: [] });
    alvo.componentInstance['alternarCriarItem']();
    alvo.componentInstance['itemCustomForm'].setValue({
      nome: '  Amuleto  ',
      categoria: ItemCategoriaEnum.EXOTICOS,
      custo: 300,
      peso: 2,
      descricao: '  Brilha no escuro  ',
      dano: '',
      informacao: '',
      resistencia: '',
      bonus: '',
      categoriaEmprestada: '',
      modulo: '',
      baseConstrutor: '',
    });
    alvo.componentInstance['confirmarCriarItem']();
    expect(alvo.emitidos[0].itens).toEqual([
      {
        nome: 'Amuleto',
        categoria: ItemCategoriaEnum.EXOTICOS,
        custo: 300,
        peso: 2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        descricao: 'Brilha no escuro',
      },
    ]);
  });

  it('item custom de arma guarda o dano/informação e o motor calcula o stat de verdade', () => {
    const alvo = montar({ itens: [], amplificadores: [] });
    alvo.componentInstance['alternarCriarItem']();
    alvo.componentInstance['itemCustomForm'].setValue({
      nome: 'Manopla de Sangue',
      categoria: ItemCategoriaEnum.EXOTICOS,
      custo: 400,
      peso: 2,
      descricao: '',
      dano: '3D6+FOR [Físico]',
      informacao: 'Corpo',
      resistencia: '',
      bonus: '',
      categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      modulo: '',
      baseConstrutor: '',
    });
    alvo.componentInstance['confirmarCriarItem']();
    const item = alvo.emitidos[0].itens[0];
    expect(item.dano).toBe('3D6+FOR [Físico]');
    expect(item.categoriaEmprestada).toBe(ItemCategoriaEnum.CORPO_A_CORPO);
    // O stat exibido do item é calculado pelo motor a partir do dano embutido.
    alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
    alvo.fixture.detectChanges();
    expect(alvo.componentInstance['itensInventario']()[0].stat).toContain('3D6+FOR');
  });

  it('rola o dano de uma arma pelo card e joga o resultado na bandeja (m3-45)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    const botaoRolar = alvo.raiz.querySelector('.ficha-inv__item-rolar') as HTMLButtonElement;
    expect(botaoRolar).toBeTruthy();
    botaoRolar.click();
    expect(alvo.mostrar).toHaveBeenCalledTimes(1);
    const chamada = alvo.mostrar.mock.calls[0][0];
    expect(chamada.rotulo).toBe('Leve');
    // Dano do catálogo (m3-18, sem mods) — a fórmula que vai ao motor é a mesma exibida no card.
    expect(chamada.formula).toBe('1D6+DES [Físico]');
    expect(chamada.resultado.total).toBeGreaterThanOrEqual(0);
  });

  it('mantém o botão "Rolar dano" mesmo sem edição (rolar não é ação de edição da ficha)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] }, false);
    expect(alvo.raiz.querySelector('.ficha-inv__item-rolar')).toBeTruthy();
    // Sem edição, nem "Modificar" nem outras ações de gerenciamento aparecem.
    expect(alvo.raiz.querySelector('.ficha-inv__modificar')).toBeFalsy();
  });

  it('não oferece "Rolar dano" numa categoria sem dano computável (Armazenamento)', () => {
    const mochila: CarrinhoItemDto = {
      nome: 'Mochila Pequena',
      categoria: ItemCategoriaEnum.ARMAZENAMENTO,
      custo: 300,
      peso: 0.3,
      quantidade: 1,
      guardada: true,
      modificacoes: [],
    };
    const alvo = montar({ itens: [mochila], amplificadores: [] });
    expect(alvo.raiz.querySelector('.ficha-inv__item-rolar')).toBeFalsy();
  });

  it('modificação custom com efeito mecânico (dano fixo) grava o efeito no item', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({ nome: 'Afiada', descricao: '' });
    alvo.componentInstance['adicionarEfeitoMod']();
    alvo.componentInstance['efeitosMod'].at(0).patchValue({ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 3 });
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes[0].efeitos).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 3 },
    ]);
  });

  it('modificação custom pode combinar efeitos (dados de dano + condição)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({ nome: 'Ígnea', descricao: '' });
    alvo.componentInstance['adicionarEfeitoMod']();
    alvo.componentInstance['efeitosMod'].at(0).patchValue({
      tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS,
      valor: 1,
      faces: 6,
      tipoDano: 'Químico',
    });
    alvo.componentInstance['adicionarEfeitoMod']();
    alvo.componentInstance['efeitosMod'].at(1).patchValue({
      tipo: ModificacaoEfeitoTipoEnum.CONDICAO,
      condicao: 'Em Chamas',
      duracaoTurnos: 2,
    });
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes[0].efeitos).toEqual([
      { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 6, tipoDano: 'Químico' },
      { tipo: ModificacaoEfeitoTipoEnum.CONDICAO, condicao: 'Em Chamas', duracaoTurnos: 2 },
    ]);
  });

  it('aplica uma mod custom começando em 1× com o limite (empilhamentoMaximo) informado', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({
      nome: '  Amaldiçoada  ',
      empilhamentoMaximo: 3,
      descricao: '  −1 na resistência do alvo  ',
    });
    alvo.componentInstance['confirmarCriarMod'](0);
    // O campo é o TETO: a mod entra em 1× e pode subir até 3×.
    expect(alvo.emitidos[0].itens[0].modificacoes).toEqual([
      { nome: 'Amaldiçoada', empilhamentos: 1, empilhamentoMaximo: 3, descricao: '−1 na resistência do alvo' },
    ]);
  });

  it('mod custom sem peso informado não grava pesoCustom (motor usa o padrão de 0,2)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({ nome: 'Afiada' });
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes[0].pesoCustom).toBeUndefined();
  });

  it('mod custom com peso informado grava pesoCustom (m3-76)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({ nome: 'Encantada', pesoCustom: 0.5 });
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes[0]).toMatchObject({ nome: 'Encantada', pesoCustom: 0.5 });
  });

  it('mod custom com peso digitado como 0 (zero) no próprio input do DOM grava pesoCustom: 0, não o padrão (m3-76)', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarPainel'](0);
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.fixture.detectChanges();
    alvo.componentInstance['modCustomForm'].controls.nome.setValue('Leve como pluma');
    const entradaPeso = alvo.raiz.querySelector<HTMLInputElement>('input[formcontrolname="pesoCustom"]');
    expect(entradaPeso).toBeTruthy();
    entradaPeso!.value = '0';
    entradaPeso!.dispatchEvent(new Event('input'));
    alvo.fixture.detectChanges();
    expect(alvo.componentInstance['modCustomForm'].controls.pesoCustom.value).toBe(0);
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes[0]).toMatchObject({ nome: 'Leve como pluma', pesoCustom: 0 });
  });

  it('o peso exibido no card do item reflete pesoCustom da mod (m3-76) — não só o total do inventário', () => {
    // Regressão: `montarItemInventario` tinha sua própria conta de peso por mod (pro badge do
    // próprio card), separada da do motor usada pelo resumo geral — só essa segunda esquecia de
    // repassar `pesoCustom`, então o total geral batia mas o card do item ainda somava o padrão de
    // 0,2 (`docs/core/sistema-v4.1.0.md:958`) por cima de uma mod com peso zero declarado.
    const comModPesoZero: CarrinhoItemDto = {
      ...itemLeve,
      modificacoes: [{ nome: 'Leve como pluma', empilhamentos: 1, pesoCustom: 0 }],
    };
    const alvo = montar({ itens: [comModPesoZero], amplificadores: [] });
    const pesoCard = alvo.raiz.querySelector('.ficha-inv__peso')?.textContent?.trim();
    expect(pesoCard).toBe('1 slots');
  });

  it('aumentar os empilhamentos de uma mod custom preserva seus efeitos', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].patchValue({ nome: 'Ígnea', empilhamentoMaximo: 3 });
    alvo.componentInstance['adicionarEfeitoMod']();
    alvo.componentInstance['efeitosMod'].at(0).patchValue({
      tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO,
      valor: 2,
    });
    alvo.componentInstance['confirmarCriarMod'](0);
    // Reflete de volta (componente controlado) e sobe de 1× para 2×.
    alvo.fixture.componentRef.setInput('inventario', alvo.emitidos.at(-1));
    alvo.fixture.detectChanges();
    alvo.componentInstance['adicionarModificacao'](0, 'Ígnea');
    const mod = alvo.emitidos.at(-1)!.itens[0].modificacoes[0];
    expect(mod.empilhamentos).toBe(2);
    expect(mod.efeitos).toEqual([{ tipo: ModificacaoEfeitoTipoEnum.DANO_FIXO, valor: 2 }]);
    expect(mod.empilhamentoMaximo).toBe(3);
  });

  it('mod marcada "não conta no total" fica fora do contador; com "não conta no teto" também não fica excedente', () => {
    // Prestígio 0 → Agente: máx 2 mods, 1 stack/mod. Uma mod de 3× normalmente excederia os dois.
    const item: CarrinhoItemDto = {
      nome: 'Faca',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 100,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modificacoes: [
        { nome: 'Bônus grátis', empilhamentos: 3, empilhamentoMaximo: 5, ignoraLimiteTotal: true, ignoraLimiteProprio: true },
      ],
    };
    const alvo = montar({ itens: [item], amplificadores: [] }, true, 0);
    const vm = alvo.componentInstance['itensInventario']()[0];
    expect(vm.modsUsados).toBe(0); // não conta no total da arma
    expect(vm.excedeModsLimite).toBe(false);
    expect(vm.modsAtivas[0].excedente).toBe(false); // isenta do total e do stack por-mod
    expect(vm.modsAtivas[0].ignoraTotal).toBe(true);
    expect(vm.modsAtivas[0].ignoraProprio).toBe(true);
  });

  it('alternarIgnoraProprio libera empilhar além do teto próprio da mod', () => {
    const item: CarrinhoItemDto = {
      nome: 'Faca',
      categoria: ItemCategoriaEnum.CORPO_A_CORPO,
      custo: 100,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modificacoes: [{ nome: 'Custom', empilhamentos: 2, empilhamentoMaximo: 2 }],
    };
    const alvo = montar({ itens: [item], amplificadores: [] });
    // No teto (2/2): não pode aumentar.
    expect(alvo.componentInstance['itensInventario']()[0].modsAtivas[0].podeAumentar).toBe(false);
    // Marca "não conta no próprio teto" e agora pode passar do limite.
    alvo.componentInstance['alternarIgnoraProprio'](0, 'Custom');
    alvo.fixture.componentRef.setInput('inventario', alvo.emitidos.at(-1));
    alvo.fixture.detectChanges();
    expect(alvo.componentInstance['itensInventario']()[0].modsAtivas[0].podeAumentar).toBe(true);
    alvo.componentInstance['adicionarModificacao'](0, 'Custom');
    expect(alvo.emitidos.at(-1)!.itens[0].modificacoes[0].empilhamentos).toBe(3);
  });

  it('alterna o porte (guardada/vestida) de um armazenamento e emite', () => {
    const mochila: CarrinhoItemDto = {
      nome: 'Mochila',
      categoria: ItemCategoriaEnum.ARMAZENAMENTO,
      custo: 300,
      peso: 1,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
    };
    const alvo = montar({ itens: [mochila], amplificadores: [] });
    alvo.fixture.componentInstance['alternarGuardada'](0);
    expect(alvo.emitidos[0].itens[0].guardada).toBe(true);
  });

  it('adquire e depois remove um amplificador, emitindo a lista correspondente', () => {
    const alvo = montar({ itens: [], amplificadores: [] });
    // "Atento" existe no catálogo de amplificadores; adquire com os empilhamentos iniciais.
    alvo.fixture.componentInstance['adicionarAmplificador']('Atento');
    expect(alvo.emitidos[0].amplificadores).toEqual([{ nome: 'Atento', empilhamentos: 1 }]);

    // Reflete a aquisição de volta na entrada (componente controlado) e remove.
    alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
    alvo.fixture.detectChanges();
    alvo.fixture.componentInstance['removerAmplificador']('Atento');
    expect(alvo.emitidos[1].amplificadores).toEqual([]);
  });

  it('não deixa o total de stacks passar do limite (Vontade × 3) ao adicionar um amplificador de 2 stacks iniciais', () => {
    // limite = Vontade(1) × 3 = 3; já há 2 stacks de "Atento" portados. "Veloz" entra de uma vez com
    // 2 stacks iniciais (doc — "■■") — 2 + 2 = 4 > 3, então a aquisição deve ser bloqueada por
    // inteiro (bug anterior checava só "+1", deixando passar do limite: 2 + 1 <= 3 era verdadeiro).
    const alvo = montar({ itens: [], amplificadores: [{ nome: 'Atento', empilhamentos: 2 }] });
    alvo.fixture.componentRef.setInput('vontade', 1);
    alvo.fixture.detectChanges();
    alvo.fixture.componentInstance['adicionarAmplificador']('Veloz');
    expect(alvo.emitidos).toEqual([]);
  });

  it('o catálogo já mostra "Veloz" como indisponível quando os 2 stacks iniciais não cabem no limite', () => {
    const alvo = montar({ itens: [], amplificadores: [{ nome: 'Atento', empilhamentos: 2 }] });
    alvo.fixture.componentRef.setInput('vontade', 1);
    alvo.fixture.detectChanges();
    const cartoes = alvo.fixture.componentInstance['amplificadoresCatalogo']();
    const veloz = cartoes.find((cartao: { nome: string }) => cartao.nome === 'Veloz');
    expect(veloz?.podeAdicionar).toBe(false);
    // "Atento" já está em 2/3 (empilhamentoMaximo) e incrementar por +1 cabe no limite (2+1=3) — continua disponível.
    const atento = cartoes.find((cartao: { nome: string }) => cartao.nome === 'Atento');
    expect(atento?.podeAdicionar).toBe(true);
  });

  describe('equipado — Proteções (m3-36)', () => {
    const colete: CarrinhoItemDto = {
      nome: 'Colete Kevlar',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 400,
      peso: 2,
      quantidade: 1,
      guardada: false,
      modificacoes: [],
      resistencia: '3 [Balístico]',
    };

    it('mostra o toggle "Equipado"/"Na mochila" só em Proteções', () => {
      const { raiz } = montar({ itens: [colete, itemLeve], amplificadores: [] });
      const rotulos = Array.from(raiz.querySelectorAll('.ficha-inv__porte')).map((b) =>
        b.textContent?.trim(),
      );
      expect(rotulos).toEqual(['Na mochila']);
    });

    it('alterna equipado e emite o item atualizado', () => {
      const alvo = montar({ itens: [colete], amplificadores: [] });
      alvo.fixture.componentInstance['alternarEquipado'](0);
      expect(alvo.emitidos[0].itens[0].equipado).toBe(true);
      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();
      alvo.fixture.componentInstance['alternarEquipado'](0);
      expect(alvo.emitidos[1].itens[0].equipado).toBe(false);
    });
  });

  describe('linha "Inventário" (peso usado / máximo editável no próprio lugar)', () => {
    it('mostra "Inventário" com o peso usado sobre o máximo', () => {
      const { raiz } = montar({ itens: [itemLeve], amplificadores: [] });
      const linha = raiz.querySelector('.ficha-inv__carga');
      expect(linha?.querySelector('.ficha-inv__carga-rotulo')?.textContent?.trim()).toBe('Inventário');
      expect(linha?.querySelector('.ficha-inv__carga-valor')?.textContent?.trim()).toBe('1 / 25');
    });

    it('amplificador "Inventário" soma +5 ao máximo efetivo (m3-43 — antes não era consumido em lugar nenhum)', () => {
      const { raiz } = montar({
        itens: [itemLeve],
        amplificadores: [{ nome: 'Inventário', empilhamentos: 1 }],
      });
      const linha = raiz.querySelector('.ficha-inv__carga');
      // Base 25 (input) + 5 do amplificador "Inventário" = 30 efetivo.
      expect(linha?.querySelector('.ficha-inv__carga-valor')?.textContent?.trim()).toBe('1 / 30');
    });

    it('"Inventário" escala com os empilhamentos (+5 por stack); "Veloz" penaliza -2/stack além do 1º', () => {
      const { raiz } = montar({
        itens: [itemLeve],
        amplificadores: [
          { nome: 'Inventário', empilhamentos: 3 },
          { nome: 'Veloz', empilhamentos: 2 },
        ],
      });
      const linha = raiz.querySelector('.ficha-inv__carga');
      // Base 25 + 15 (Inventário, 5 × 3 stacks) - 2 (Veloz, 1 stack além do 1º) = 38.
      expect(linha?.querySelector('.ficha-inv__carga-valor')?.textContent?.trim()).toBe('1 / 38');
    });

    it('a edição no próprio lugar continua mostrando a base (25), não o efetivo com amplificador', () => {
      const alvo = montar({
        itens: [itemLeve],
        amplificadores: [{ nome: 'Inventário', empilhamentos: 1 }],
      });
      alvo.componentInstance['editarInventarioMaximo']();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>('.ficha-inv__carga input');
      expect(entrada?.value).toBe('25');
    });

    it('quem não edita vê só o texto — sem botão nem input', () => {
      const { raiz } = montar({ itens: [itemLeve], amplificadores: [] }, false);
      const linha = raiz.querySelector('.ficha-inv__carga');
      expect(linha?.querySelector('button')).toBeNull();
      expect(linha?.querySelector('input')).toBeNull();
      expect(linha?.querySelector('.ficha-inv__carga-valor')?.textContent?.trim()).toBe('1 / 25');
    });

    it('clicar no valor abre a digitação e confirmar (Enter) emite o novo máximo', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      const emitidos: number[] = [];
      alvo.componentInstance.ajusteInventarioMaximo.subscribe((valor) => emitidos.push(valor));

      alvo.componentInstance['editarInventarioMaximo']();
      expect(alvo.componentInstance['editandoInventarioMaximo']()).toBe(true);

      alvo.componentInstance['confirmarInventarioMaximo']('40');
      expect(alvo.componentInstance['editandoInventarioMaximo']()).toBe(false);
      expect(emitidos).toEqual([40]);
    });

    it('Escape cancela a digitação sem emitir', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      const emitidos: number[] = [];
      alvo.componentInstance.ajusteInventarioMaximo.subscribe((valor) => emitidos.push(valor));

      alvo.componentInstance['editarInventarioMaximo']();
      alvo.componentInstance['cancelarInventarioMaximo']();
      expect(alvo.componentInstance['editandoInventarioMaximo']()).toBe(false);
      expect(emitidos).toEqual([]);
    });

    it('confirmar com o mesmo valor não emite', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      const emitidos: number[] = [];
      alvo.componentInstance.ajusteInventarioMaximo.subscribe((valor) => emitidos.push(valor));

      alvo.componentInstance['editarInventarioMaximo']();
      alvo.componentInstance['confirmarInventarioMaximo']('25');
      expect(emitidos).toEqual([]);
    });

    it('preenche a barra proporcional ao peso usado ÷ inventário efetivo', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.fixture.componentRef.setInput('inventarioMaximo', 4); // peso 1 / 4 = 25%.
      alvo.fixture.detectChanges();
      const preenchimento = alvo.raiz.querySelector<HTMLElement>('.ficha-inv__carga-preenchimento');
      expect(preenchimento?.style.width).toBe('25%');
    });

    it('marca aviso quando o peso usado ultrapassa o inventário efetivo', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.fixture.componentRef.setInput('inventarioMaximo', 0);
      alvo.fixture.detectChanges();
      expect(
        alvo.raiz.querySelector('.ficha-inv__carga')?.classList.contains('ficha-inv__carga--aviso'),
      ).toBe(true);
    });

    it('sem sobrecarga: sem ícone de alerta', () => {
      const { raiz } = montar({ itens: [itemLeve], amplificadores: [] });
      expect(raiz.querySelector('.ficha-inv__carga-alerta')).toBeNull();
    });

    it('com sobrecarga: mostra o ícone de alerta com dica "Sobrecarregado!"', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.fixture.componentRef.setInput('inventarioMaximo', 0);
      alvo.fixture.detectChanges();
      const alerta = alvo.raiz.querySelector('.ficha-inv__carga-alerta');
      expect(alerta).not.toBeNull();
      const dica = alvo.fixture.debugElement
        .query(By.css('.ficha-inv__carga-alerta'))
        .injector.get(Tooltip).appTooltip();
      expect(dica).toBe('Sobrecarregado!');
    });
  });

  describe('apelido de equipamento (m3-33)', () => {
    it('exibe o apelido em destaque e o nome mecânico como legenda quando tem apelido', () => {
      const { raiz } = montar({
        itens: [{ ...itemLeve, apelido: 'Espada Excalibur' }],
        amplificadores: [],
      });
      expect(raiz.querySelector('.ficha-inv__item-nome')?.textContent).toContain(
        'Espada Excalibur',
      );
      expect(raiz.querySelector('.ficha-inv__item-nome-mecanico')?.textContent?.trim()).toBe(
        'Leve — Corpo a Corpo',
      );
    });

    it('exibe só o nome mecânico quando não tem apelido, sem legenda extra', () => {
      const { raiz } = montar({ itens: [itemLeve], amplificadores: [] });
      expect(raiz.querySelector('.ficha-inv__item-nome')?.textContent).toContain('Leve');
      expect(raiz.querySelector('.ficha-inv__item-nome-mecanico')).toBeNull();
    });

    it('não oferece o lápis de apelido em categorias empilháveis (Operacional/Medicinal)', () => {
      const operacional: CarrinhoItemDto = {
        nome: 'Kit Médico',
        categoria: ItemCategoriaEnum.MEDICINAL,
        custo: 100,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
      };
      const { raiz } = montar({ itens: [operacional, itemLeve], amplificadores: [] });
      expect(raiz.querySelectorAll('.ficha-inv__item-apelido-lapis').length).toBe(1);
    });

    it('não oferece o lápis quando não é editável', () => {
      const { raiz } = montar({ itens: [itemLeve], amplificadores: [] }, false);
      expect(raiz.querySelector('.ficha-inv__item-apelido-lapis')).toBeNull();
    });

    it('abre a entrada ao clicar no lápis e emite o apelido ao confirmar', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.raiz.querySelector<HTMLButtonElement>('.ficha-inv__item-apelido-lapis')!.click();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>('.ficha-inv__item-apelido-entrada')!;
      entrada.value = 'Espada Excalibur';
      entrada.dispatchEvent(new Event('blur'));
      alvo.fixture.detectChanges();

      expect(alvo.emitidos).toHaveLength(1);
      expect(alvo.emitidos[0].itens[0].apelido).toBe('Espada Excalibur');
    });

    it('confirmar com texto vazio remove o apelido (volta ao nome mecânico)', () => {
      const alvo = montar({ itens: [{ ...itemLeve, apelido: 'Espada Excalibur' }], amplificadores: [] });
      alvo.raiz.querySelector<HTMLButtonElement>('.ficha-inv__item-apelido-lapis')!.click();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>('.ficha-inv__item-apelido-entrada')!;
      entrada.value = '   ';
      entrada.dispatchEvent(new Event('blur'));
      alvo.fixture.detectChanges();

      expect(alvo.emitidos[0].itens[0].apelido).toBeUndefined();
    });

    it('Escape cancela a edição sem emitir', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.raiz.querySelector<HTMLButtonElement>('.ficha-inv__item-apelido-lapis')!.click();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>('.ficha-inv__item-apelido-entrada')!;
      entrada.value = 'Descartado';
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      alvo.fixture.detectChanges();

      expect(alvo.raiz.querySelector('.ficha-inv__item-apelido-entrada')).toBeNull();
      expect(alvo.emitidos).toHaveLength(0);
    });

    it('não empilha um item apelidado com outro sem apelido de mesma categoria/nome', () => {
      const alvo = montar({
        itens: [{ ...itemLeve, categoria: ItemCategoriaEnum.OPERACIONAL, apelido: 'Kit da sorte' }],
        amplificadores: [],
      });
      const operacional: CarrinhoItemDto = {
        nome: 'Kit de Ferramentas',
        categoria: ItemCategoriaEnum.OPERACIONAL,
        custo: 100,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
      };
      // Reconstrói o inventário com um item "Leve" empilhável (Operacional) apelidado, depois
      // adiciona o mesmo nome/categoria sem apelido — não deve empilhar (vira uma 2ª entrada).
      alvo.fixture.componentRef.setInput('inventario', {
        itens: [{ ...operacional, apelido: 'Kit da sorte' }],
        amplificadores: [],
      });
      alvo.fixture.detectChanges();
      const cartao = alvo.fixture.componentInstance['itensCatalogo']().find(
        (c) => c.item.nome === 'Kit de Ferramentas',
      );
      if (cartao) {
        alvo.fixture.componentInstance['adicionarItem'](cartao);
        expect(alvo.emitidos[0].itens).toHaveLength(2);
      }
    });
  });

  describe('fragmentos (m3-35)', () => {
    /** Monta um fragmento (Potencializador ou Construtor) de um módulo, já com o campo exigido. */
    function fragmento(categoria: ItemCategoriaEnum, modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('adquirir um fragmento Potencializador não debita nada — só custa Energia ao ser acoplado (P-016)', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      expect(custos).toEqual([]);
    });

    it('adquirir um fragmento Construtor (módulo V) debita o dobro (6) de Energia Máxima', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 44 }]);
    });

    it('remover um fragmento Potencializador avulso (não aplicado) não restaura nada — nunca custou Energia (P-016)', () => {
      const alvo = montar({
        itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['confirmarRemocaoItem'](0);

      expect(custos).toEqual([]);
      expect(alvo.emitidos[0].itens).toHaveLength(0);
    });

    it('aplicar um fragmento Potencializador em outro item: soma o efeito, remove o fragmento e debita Energia + Energia Máxima do acoplamento — único custo desde o P-016', () => {
      const alvo = montar({
        itens: [itemLeve, fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['abrirAplicarFragmento'](1);
      alvo.fixture.componentInstance['alvoFragmento'].set(0);
      alvo.fixture.componentInstance['opcaoBonusFragmento'].set(0);
      alvo.fixture.componentInstance['confirmarAplicarFragmento'](1);

      // Módulo IV: acoplar custa 7 de Energia + 7 de Energia Máxima (exemplo do documento) — desde
      // o P-016 esse é o único débito, o fragmento não custou nada enquanto esteve solto.
      expect(custos).toEqual([{ energiaAtual: 43, energiaMaxima: 43 }]);
      expect(alvo.emitidos[0].itens).toHaveLength(1);
      const alvoResultante = alvo.emitidos[0].itens[0];
      expect(alvoResultante.nome).toBe('Leve');
      expect(alvoResultante.modificacoes).toHaveLength(1);
      expect(alvoResultante.modificacoes[0].origemFragmento).toEqual({
        tipo: FragmentoTipoEnum.POTENCIALIZADOR,
        modulo: FragmentoModuloEnum.IV,
      });
      expect(alvoResultante.modificacoes[0].ignoraLimiteTotal).toBe(true);
    });

    it('remover (desacoplar) uma mod de fragmento debita Energia × 2 e restitui por completo a Energia Máxima do acoplamento (P-016)', () => {
      const itemComFragmento: CarrinhoItemDto = {
        ...itemLeve,
        modificacoes: [
          {
            nome: 'Fragmento Potencializador — Módulo IV',
            empilhamentos: 1,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 3 }],
            ignoraLimiteTotal: true,
            ignoraLimiteProprio: true,
            origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.IV },
          },
        ],
      };
      const alvo = montar({ itens: [itemComFragmento], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['removerModificacao'](0, 'Fragmento Potencializador — Módulo IV');

      // Módulo IV: remover custa Energia × 2 = 14; a Energia Máxima é totalmente restituída (+7) —
      // desde o P-016 o Potencializador não custa nada enquanto solto, então nada continua drenando
      // depois que ele volta a ser avulso.
      expect(custos).toEqual([{ energiaAtual: 36, energiaMaxima: 57 }]);
      expect(alvo.emitidos[0].itens[0].modificacoes).toHaveLength(0);
      // O item-alvo continua ali, e o fragmento reaparece como item avulso no fim da lista.
      expect(alvo.emitidos[0].itens).toHaveLength(2);
      const fragmentoAvulso = alvo.emitidos[0].itens[1];
      expect(fragmentoAvulso.nome).toBe('Fragmento Potencializador — Módulo IV');
      expect(fragmentoAvulso.categoria).toBe(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR);
      expect(fragmentoAvulso.modulo).toBe(FragmentoModuloEnum.IV);
    });
  });

  /**
   * Habilidade "Anomalia" (Experimento Artificial, `P-013`) — doc: "Fragmentos custam o dobro de
   * Energia em seu uso, mas têm todos os seus efeitos dobrados". A página resolve o booleano
   * (`experimentoComAnomalia`) e repassa via `[possuiAnomalia]`; aqui prova que o componente usa o
   * input em todo custo/cardápio de Fragmento, não só no motor (`fragmento.spec.ts`).
   */
  describe('possuiAnomalia (P-013)', () => {
    function fragmento(categoria: ItemCategoriaEnum, modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('adquirir um fragmento Potencializador não debita nada mesmo com Anomalia — P-016 não abre exceção', () => {
      const alvo = montar({ itens: [], amplificadores: [] }, true, 100, true, true);
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      expect(custos).toEqual([]);
    });

    it('adquirir um fragmento Construtor (módulo V) com Anomalia debita o quádruplo (12, não 3)', () => {
      const alvo = montar({ itens: [], amplificadores: [] }, true, 100, true, true);
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      // Base 3 × 2 (dobro do Construtor) × 2 (Anomalia) = 12 — as duas duplicações se acumulam.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 38 }]);
    });

    it('remover um fragmento Potencializador avulso não restaura nada mesmo com Anomalia — nunca custou (P-016)', () => {
      const alvo = montar(
        { itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)], amplificadores: [] },
        true,
        100,
        true,
        true,
      );
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['confirmarRemocaoItem'](0);

      expect(custos).toEqual([]);
    });

    it('remover um fragmento Construtor avulso com Anomalia restaura o quádruplo da Energia Máxima drenada na aquisição', () => {
      const alvo = montar(
        { itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR, FragmentoModuloEnum.IV)], amplificadores: [] },
        true,
        100,
        true,
        true,
      );
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['confirmarRemocaoItem'](0);

      // Base 7 × 2 (dobro do Construtor) × 2 (Anomalia) = 28.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 78 }]);
    });

    it('cardápio "Aplicar em..." (módulo V, sem alvo) vem com os valores dobrados', () => {
      const alvo = montar(
        {
          itens: [itemLeve, fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.V)],
          amplificadores: [],
        },
        true,
        100,
        true,
        true,
      );
      alvo.fixture.componentInstance['abrirAplicarFragmento'](1);
      const opcoes = alvo.fixture.componentInstance['opcoesBonusFragmento']();
      expect(opcoes[0].efeito.valor).toBe(4);
    });

    it('cardápio "Consumir" (módulo V) vem com os valores dobrados', () => {
      const alvo = montar(
        { itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.V)], amplificadores: [] },
        true,
        100,
        true,
        true,
      );
      alvo.fixture.componentInstance['consumindoFragmentoIndice'].set(0);
      const opcoes = alvo.fixture.componentInstance['opcoesConsumoFragmento']();
      expect(opcoes.map((opcao) => opcao.valor)).toEqual([2, 2, 4]);
    });

    it('cardápio "Consumir" (módulo I) concede 2 pontos de atributo, não 1', () => {
      const alvo = montar(
        { itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.I)], amplificadores: [] },
        true,
        100,
        true,
        true,
      );
      alvo.fixture.componentInstance['consumindoFragmentoIndice'].set(0);
      const opcoes = alvo.fixture.componentInstance['opcoesConsumoFragmento']();
      expect(opcoes[0]).toMatchObject({ concedePontoAtributo: true, pontosAtributo: 2 });
      expect(opcoes[0].rotulo).toContain('+2 pontos no atributo');
    });

    it('Fragmento Construtor (módulo V, Arma) nasce com os efeitos fixos dobrados', () => {
      const alvo = montar({ itens: [], amplificadores: [] }, true, 100, true, true);
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      alvo.componentInstance['confirmarCriarItem']();

      const item = alvo.emitidos[0].itens[0];
      expect(item.modificacoes[0].efeitos).toEqual([
        { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 2, faces: 8 },
        { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 2, variante: 'FIXO' },
      ]);
    });

    it('"Recarregar" munição do Construtor debita o dobro de Energia (módulo V: 3 → 6)', () => {
      const alvo = montar(
        { itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR, FragmentoModuloEnum.V)], amplificadores: [] },
        true,
        100,
        true,
        true,
      );
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['recarregarMunicaoConstrutor'](0);

      expect(custos).toEqual([{ energiaAtual: 44, energiaMaxima: 50 }]);
    });
  });

  describe('bônus fixo automático do Fragmento Construtor (m3-65)', () => {
    it('Arma (Corpo a Corpo): nasce com a modificação do módulo já aplicada, com origemFragmento', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      alvo.componentInstance['confirmarCriarItem']();

      const item = alvo.emitidos[0].itens[0];
      expect(item.modificacoes).toEqual([
        {
          nome: 'Fragmento Construtor — Módulo V',
          empilhamentos: 1,
          efeitos: [
            { tipo: ModificacaoEfeitoTipoEnum.DANO_DADOS, valor: 1, faces: 8 },
            { tipo: ModificacaoEfeitoTipoEnum.BONUS_TESTE, valor: 1, variante: 'FIXO' },
          ],
          ignoraLimiteTotal: true,
          ignoraLimiteProprio: true,
          origemFragmento: { tipo: FragmentoTipoEnum.CONSTRUTOR, modulo: FragmentoModuloEnum.V },
        },
      ]);
    });

    it('Proteção: nasce com Resistência + Esquiva/Bloqueio/Defesa do módulo (módulo I, exemplo do documento)', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Colete de Vísceras',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
        categoriaEmprestada: ItemCategoriaEnum.PROTECOES,
      });
      alvo.componentInstance['confirmarCriarItem']();

      const item = alvo.emitidos[0].itens[0];
      expect(item.modificacoes[0].efeitos).toEqual([
        { tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 10 },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 5, variante: 'Esquiva' },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 5, variante: 'Bloqueio' },
        { tipo: ModificacaoEfeitoTipoEnum.DEFESA, valor: 2, variante: 'Defesa' },
      ]);
    });

    it('Munição não modifica um item: sem categoriaEmprestada reconhecida, nasce sem modificação', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Bala de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.III,
        categoriaEmprestada: ItemCategoriaEnum.MUNICOES,
      });
      alvo.componentInstance['confirmarCriarItem']();

      expect(alvo.emitidos[0].itens[0].modificacoes).toEqual([]);
    });

    it('a modificação automática custa o dobro e não pesa (dobro de custo do Construtor, mesma task)', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        peso: 0,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      alvo.componentInstance['confirmarCriarItem']();
      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();

      const vm = alvo.componentInstance['itensInventario']()[0];
      // Corpo a Corpo custa $750/mod (padrão) — dobrado pelo Construtor = $1500; peso 0 (não soma nos "slots").
      expect(vm.modsAtivas[0].custoTexto).toBe('$1.500');
      expect(vm.pesoTexto).toBe('0 slots');
    });

    it('uma modificação comum adicionada depois (não vinda de fragmento) também custa o dobro', () => {
      const construtor: CarrinhoItemDto = {
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
        modificacoes: [],
      };
      const alvo = montar({ itens: [construtor], amplificadores: [] });
      alvo.componentInstance['adicionarModificacao'](0, 'Letal');
      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();

      const vm = alvo.componentInstance['itensInventario']()[0];
      expect(vm.modsAtivas[0].nome).toBe('Letal');
      expect(vm.modsAtivas[0].custoTexto).toBe('$1.500');
    });

    it('o bônus fixo é ineditável: sem stepper −/+ nem toggles "não conta" no chip (só na mod comum ao lado)', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      alvo.componentInstance['confirmarCriarItem']();
      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();

      alvo.componentInstance['adicionarModificacao'](0, 'Letal');
      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[1]);
      alvo.fixture.detectChanges();

      const vm = alvo.componentInstance['itensInventario']()[0];
      expect(vm.modsAtivas.find((m) => m.nome.startsWith('Fragmento Construtor'))?.fixa).toBe(true);
      expect(vm.modsAtivas.find((m) => m.nome === 'Letal')?.fixa).toBe(false);

      const chips = Array.from(alvo.raiz.querySelectorAll('.ficha-inv__mod-tag'));
      const chipFixo = chips.find((chip) => chip.textContent?.includes('Fragmento Construtor'));
      const chipComum = chips.find((chip) => chip.textContent?.includes('Letal'));
      expect(chipFixo?.querySelector('.ficha-inv__mod-tag-botoes')).toBeNull();
      expect(chipFixo?.querySelector('.ficha-inv__mod-flags')).toBeNull();
      expect(chipComum?.querySelector('.ficha-inv__mod-tag-botoes')).toBeTruthy();
      expect(chipComum?.querySelector('.ficha-inv__mod-flags')).toBeTruthy();
    });
  });

  describe('seletor "Base" do Fragmento Construtor (m3-69)', () => {
    it('Arma: escolher uma Base do catálogo trava dano/informação e o dano final combina base + bônus do módulo', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      expect(alvo.componentInstance['mostraBaseConstrutor']()).toBe(true);
      expect(alvo.componentInstance['opcoesBaseConstrutor']().map((i: { nome: string }) => i.nome)).toContain(
        'Mediana',
      );

      alvo.componentInstance['escolherBaseConstrutor']('Mediana');
      const controles = alvo.componentInstance['itemCustomForm'].controls;
      expect(controles.dano.value).toBe('3D4+FOR [Físico]');
      expect(controles.dano.disabled).toBe(true);
      expect(controles.informacao.disabled).toBe(true);
      expect(controles.peso.value).toBe(2); // peso da Mediana no catálogo

      alvo.componentInstance['confirmarCriarItem']();
      const item = alvo.emitidos[0].itens[0];
      expect(item.dano).toBe('3D4+FOR [Físico]');
      expect(item.peso).toBe(2);

      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();
      const stat = alvo.componentInstance['itensInventario']()[0].stat;
      // Base real (Mediana, 3D4) + bônus fixo do Módulo I (+2 dados na base, +4D12 à parte, doc:
      // "+4D12 de dano, +2 dados e +10 de teste") — 3+2=5D4 na base, mais o grupo extra 4D12; nenhum
      // dos dois grupos de dado desaparece.
      expect(stat).toContain('5D4');
      expect(stat).toContain('4D12');
    });

    it('Proteção: mesmo padrão — trava resistência e o motor funde a resistência da Base com o bônus do módulo', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Colete de Vísceras',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
        categoriaEmprestada: ItemCategoriaEnum.PROTECOES,
      });
      alvo.componentInstance['escolherBaseConstrutor']('Colete Tático');
      const controles = alvo.componentInstance['itemCustomForm'].controls;
      expect(controles.resistencia.value).toBe('4 [Físico]');
      expect(controles.resistencia.disabled).toBe(true);
      expect(controles.peso.value).toBe(1); // peso do Colete Tático no catálogo

      alvo.componentInstance['confirmarCriarItem']();
      const item = alvo.emitidos[0].itens[0];
      expect(item.resistencia).toBe('4 [Físico]');
      expect(item.peso).toBe(1);

      alvo.fixture.componentRef.setInput('inventario', alvo.emitidos[0]);
      alvo.fixture.detectChanges();
      // Base real (4 [Físico]) + bônus fixo de Resistência do Módulo I (10) = 14 [Físico].
      expect(alvo.componentInstance['itensInventario']()[0].stat).toContain('14 [Físico]');
    });

    it('"Outra" (padrão) mantém dano/resistência como texto livre, exatamente como antes desta task', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Machado Improvisado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      const controles = alvo.componentInstance['itemCustomForm'].controls;
      expect(controles.baseConstrutor.value).toBe('');
      expect(controles.dano.disabled).toBe(false);

      controles.dano.setValue('2D6+FOR [Físico]');
      alvo.componentInstance['confirmarCriarItem']();
      expect(alvo.emitidos[0].itens[0].dano).toBe('2D6+FOR [Físico]');
    });

    it('trocar de Base recalcula os campos travados', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
      });
      const controles = alvo.componentInstance['itemCustomForm'].controls;

      alvo.componentInstance['escolherBaseConstrutor']('Mediana');
      expect(controles.dano.value).toBe('3D4+FOR [Físico]');
      expect(controles.peso.value).toBe(2);

      alvo.componentInstance['escolherBaseConstrutor']('Grande');
      expect(controles.dano.value).toBe('3D6+FOR [Físico]');
      expect(controles.peso.value).toBe(3);

      // Voltar pra "Outra" destrava os campos e limpa o texto herdado da Base anterior.
      alvo.componentInstance['escolherBaseConstrutor']('');
      expect(controles.dano.value).toBe('');
      expect(controles.dano.disabled).toBe(false);
    });

    it('categoria sem base reconhecida pelo doc (Munições/Explosivos) não mostra o seletor', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['itemCustomForm'].patchValue({
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        categoriaEmprestada: ItemCategoriaEnum.MUNICOES,
      });
      expect(alvo.componentInstance['mostraBaseConstrutor']()).toBe(false);
      expect(alvo.componentInstance['opcoesBaseConstrutor']()).toEqual([]);
    });
  });

  describe('"Recarregar" Munição de Fragmento Construtor (m3-65)', () => {
    function municaoConstrutor(modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Bala de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modulo,
        categoriaEmprestada: ItemCategoriaEnum.MUNICOES,
        modificacoes: [],
      };
    }

    it('mostra o botão "Recarregar" só na Munição Construtor', () => {
      const construtorArma: CarrinhoItemDto = {
        nome: 'Espada de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modulo: FragmentoModuloEnum.V,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
        modificacoes: [],
      };
      const alvo = montar({ itens: [itemLeve, construtorArma, municaoConstrutor(FragmentoModuloEnum.V)], amplificadores: [] });
      const botoes = Array.from(alvo.raiz.querySelectorAll('button')).filter((botao) => botao.textContent?.trim() === 'Recarregar');
      expect(botoes).toHaveLength(1);
    });

    it('clicar "Recarregar" (módulo V) debita 3 de Energia atual e marca "recarregada" — exemplo do documento', () => {
      const alvo = montar({ itens: [municaoConstrutor(FragmentoModuloEnum.V)], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      const botao = Array.from(alvo.raiz.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Recarregar');
      botao?.dispatchEvent(new Event('click'));

      expect(custos).toEqual([{ energiaAtual: 47, energiaMaxima: 50 }]);
      expect(alvo.emitidos[0].itens[0].recarregada).toBe(true);
    });

    it('recarregar de novo sem antes encerrar a cena não debita Energia outra vez', () => {
      const alvo = montar({ itens: [{ ...municaoConstrutor(FragmentoModuloEnum.V), recarregada: true }], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.componentInstance['recarregarMunicaoConstrutor'](0);

      expect(custos).toEqual([]);
      expect(alvo.emitidos).toHaveLength(0);
    });

    it('encerrar a cena (reset manual) volta "recarregada" a false sem alterar Energia', () => {
      const alvo = montar({ itens: [{ ...municaoConstrutor(FragmentoModuloEnum.IV), recarregada: true }], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.componentInstance['resetarMunicaoConstrutor'](0);

      expect(custos).toEqual([]);
      expect(alvo.emitidos[0].itens[0].recarregada).toBe(false);
    });
  });

  describe('cardápio, restrição de alvo e função única do Potencializador (m3-63)', () => {
    function fragmento(modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('o alvo com dado (dano) ganha a 5ª opção do cardápio, na posição logo após a 1ª', () => {
      const alvo = montar({
        itens: [itemLeve, fragmento(FragmentoModuloEnum.V)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);

      alvo.componentInstance['alvoFragmento'].set(0);
      expect(alvo.componentInstance['opcoesBonusFragmento']()).toHaveLength(6);
      expect(alvo.componentInstance['opcoesBonusFragmento']()[1].efeito.tipo).toBe(
        ModificacaoEfeitoTipoEnum.DANO_FIXO,
      );
    });

    it('o alvo sem dado (ex.: proteção) fica com o cardápio de 5 opções (sem a 5ª)', () => {
      const protecao: CarrinhoItemDto = {
        nome: 'Colete',
        categoria: ItemCategoriaEnum.PROTECOES,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        equipado: true,
        resistencia: '10 [Físico]',
        modificacoes: [],
      };
      const alvo = montar({
        itens: [protecao, fragmento(FragmentoModuloEnum.V)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);

      alvo.componentInstance['alvoFragmento'].set(0);
      expect(alvo.componentInstance['opcoesBonusFragmento']()).toHaveLength(5);
    });

    it('trocar de alvo zera o bônus escolhido (o índice da opção pode não corresponder mais)', () => {
      const alvo = montar({
        itens: [itemLeve, fragmento(FragmentoModuloEnum.V)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);
      alvo.componentInstance['opcaoBonusFragmento'].set(2);

      alvo.componentInstance['escolherAlvoFragmento']({ target: { value: '0' } } as unknown as Event);

      expect(alvo.componentInstance['opcaoBonusFragmento']()).toBeNull();
    });

    it('um fragmento Potencializador nunca aparece como alvo disponível de outro fragmento', () => {
      const alvo = montar({
        itens: [fragmento(FragmentoModuloEnum.V), fragmento(FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](0);

      const alvos = alvo.componentInstance['alvosFragmentoDisponiveis']();
      expect(alvos.map((a) => a.indice)).toEqual([]);
    });

    it('um fragmento Construtor nunca aparece como alvo disponível', () => {
      const construtor: CarrinhoItemDto = {
        nome: 'Faca de Ossos',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        custo: 0,
        peso: 1,
        quantidade: 1,
        guardada: false,
        modulo: FragmentoModuloEnum.III,
        categoriaEmprestada: ItemCategoriaEnum.CORPO_A_CORPO,
        modificacoes: [],
      };
      const alvo = montar({
        itens: [itemLeve, construtor, fragmento(FragmentoModuloEnum.V)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](2);

      const alvos = alvo.componentInstance['alvosFragmentoDisponiveis']();
      expect(alvos.map((a) => a.indice)).toEqual([0]);
    });

    it('o fragmento sendo aplicado nunca aparece como o próprio alvo', () => {
      const alvo = montar({
        itens: [fragmento(FragmentoModuloEnum.V)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](0);

      expect(alvo.componentInstance['alvosFragmentoDisponiveis']()).toEqual([]);
    });

    it('bloqueia aplicar um 2º fragmento na mesma função (efeito) do mesmo item: não emite e sinaliza o conflito (m3-68)', () => {
      const itemComFragmentoDeEfeito: CarrinhoItemDto = {
        ...itemLeve,
        modificacoes: [
          {
            nome: 'Fragmento Potencializador — Módulo V',
            empilhamentos: 1,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 2, variante: 'DADO' }],
            ignoraLimiteTotal: true,
            ignoraLimiteProprio: true,
            origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
          },
        ],
      };
      const alvo = montar({
        itens: [itemComFragmentoDeEfeito, fragmento(FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);
      alvo.componentInstance['alvoFragmento'].set(0);
      // Opção 0 é sempre "+N dados de efeito" — mesma função "efeito" do fragmento já aplicado.
      alvo.componentInstance['opcaoBonusFragmento'].set(0);

      expect(alvo.componentInstance['conflitoFuncaoFragmento']()).toBe(true);

      alvo.componentInstance['confirmarAplicarFragmento'](1);

      expect(alvo.emitidos).toHaveLength(0);
    });

    it('não bloqueia uma função diferente (efeito ocupado, teste livre) no mesmo item', () => {
      const itemComFragmentoDeEfeito: CarrinhoItemDto = {
        ...itemLeve,
        modificacoes: [
          {
            nome: 'Fragmento Potencializador — Módulo V',
            empilhamentos: 1,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 2, variante: 'DADO' }],
            ignoraLimiteTotal: true,
            ignoraLimiteProprio: true,
            origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.V },
          },
        ],
      };
      const alvo = montar({
        itens: [itemComFragmentoDeEfeito, fragmento(FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);
      alvo.componentInstance['alvoFragmento'].set(0);
      // Índice 2 (com a 5ª opção presente, "Leve" tem dado): "+N dado(s) no teste" — função "teste".
      const opcoes = alvo.componentInstance['opcoesBonusFragmento']();
      const indiceTeste = opcoes.findIndex(
        (opcao: { efeito: { tipo: ModificacaoEfeitoTipoEnum } }) =>
          opcao.efeito.tipo === ModificacaoEfeitoTipoEnum.BONUS_TESTE,
      );
      alvo.componentInstance['opcaoBonusFragmento'].set(indiceTeste);

      expect(alvo.componentInstance['conflitoFuncaoFragmento']()).toBe(false);

      alvo.componentInstance['confirmarAplicarFragmento'](1);

      expect(alvo.emitidos).toHaveLength(1);
    });

    it('uma modificação comum (sem origemFragmento) com o mesmo tipo de efeito nunca bloqueia — a regra é só entre fragmentos', () => {
      const itemComModComum: CarrinhoItemDto = {
        ...itemLeve,
        modificacoes: [
          {
            nome: 'Reforçada',
            empilhamentos: 1,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.EFEITO, valor: 1, variante: 'DADO' }],
          },
        ],
      };
      const alvo = montar({
        itens: [itemComModComum, fragmento(FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);
      alvo.componentInstance['alvoFragmento'].set(0);
      alvo.componentInstance['opcaoBonusFragmento'].set(0);

      expect(alvo.componentInstance['conflitoFuncaoFragmento']()).toBe(false);
    });
  });

  describe('consumir fragmento — Preço de Sanidade (m3-42)', () => {
    function fragmento(modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('consumir remove o fragmento e debita o preço físico extra (módulo III) — nada a restituir da aquisição desde o P-016', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(1); // "+3 em Defesa"
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      // Módulo III: preço físico extra = 12 × 3 = 36; a aquisição nunca custou nada (P-016), então
      // não há restituição. 50 (base) + 0 (restituição) − 36 (preço físico) = 14.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 14 }]);
      expect(alvo.emitidos[0].itens).toHaveLength(0);
    });

    it('consumir sem declarar que evitou: emite a sequela "Rejeição Biológica" ×multiplicador do módulo, com a descrição do fragmento e do bônus', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      const sequelas: (readonly { nome: string; descricao?: string }[])[] = [];
      alvo.fixture.componentInstance.sequelasFragmentoConsumido.subscribe((s) => sequelas.push(s));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(1); // "+3 em Defesa"
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      // Módulo III: multiplicador 3 (doc: "3× mais forte").
      const descricao = 'Fragmento Potencializador Módulo III consumido — +3 em Defesa';
      expect(sequelas).toEqual([
        [
          { nome: 'Rejeição Biológica', descricao },
          { nome: 'Rejeição Biológica', descricao },
          { nome: 'Rejeição Biológica', descricao },
        ],
      ]);
    });

    it('declarando que evitou com o teste de Vontade: não emite sequela nenhuma, mas ainda debita a Energia e ainda registra o consumo (m3-64)', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      const sequelas: (readonly unknown[])[] = [];
      alvo.fixture.componentInstance.sequelasFragmentoConsumido.subscribe((s) => sequelas.push(s));
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));
      const registros: FichaFragmentoConsumidoDto[] = [];
      alvo.fixture.componentInstance.fragmentoConsumido.subscribe((r) => registros.push(r));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(1); // "+3 em Defesa"
      alvo.fixture.componentInstance['alternarEvitouSequelaConsumo']();
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(sequelas).toEqual([]);
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 14 }]);
      // O rastro do consumo (m3-64) é incondicional — evitar a sequela não apaga o registro. Carrega
      // também o suficiente para reverter (m3-64, correção): opção, atributo, delta de Energia
      // Máxima (14 − 50 = −36, mesma conta do teste de `ajusteEnergiaFragmento` acima) e o item.
      expect(registros).toEqual([
        {
          modulo: FragmentoModuloEnum.III,
          bonusEscolhido: '+3 em Defesa',
          opcao: { rotulo: '+3 em Defesa', tipo: 'DEFESA', valor: 3 },
          atributoEscolhido: null,
          deltaEnergiaMaxima: -36,
          item: fragmento(FragmentoModuloEnum.III),
        },
      ]);
    });

    it('cancelar fecha o painel sem alterar o inventário nem emitir nada', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['cancelarConsumirFragmento']();

      expect(alvo.fixture.componentInstance['consumindoFragmentoIndice']()).toBeNull();
      expect(alvo.emitidos).toHaveLength(0);
    });
  });

  describe('consumir fragmento — cardápio "Consumido" e bônus permanente do agente (m3-64)', () => {
    function fragmento(modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('abrir o painel oferece as 3 opções do cardápio "Consumido" do módulo do fragmento', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);

      const opcoes = alvo.fixture.componentInstance['opcoesConsumoFragmento']();
      expect(opcoes.map((opcao: { tipo: string }) => opcao.tipo)).toEqual(['TESTE', 'DEFESA', 'DANO_CORPO']);
    });

    it('sem escolher um bônus: confirmar não faz nada (nem remove o item, nem emite)', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(alvo.emitidos).toHaveLength(0);
    });

    it('bônus de teste escolhido sem escolher o atributo: confirmar não faz nada', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(0); // "TESTE"
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(alvo.emitidos).toHaveLength(0);
    });

    it('escolher um bônus de Defesa e confirmar emite bonusConsumoFragmento com a opção, sem atributo', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      const bonus: unknown[] = [];
      alvo.fixture.componentInstance.bonusConsumoFragmento.subscribe((b) => bonus.push(b));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(1); // "+3 em Defesa"
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(bonus).toEqual([
        { opcao: { rotulo: '+3 em Defesa', tipo: 'DEFESA', valor: 3 }, atributoEscolhido: null },
      ]);
    });

    it('escolher o bônus de teste e um atributo emite bonusConsumoFragmento com o atributo escolhido', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      const bonus: { opcao: { tipo: string }; atributoEscolhido: string | null }[] = [];
      alvo.fixture.componentInstance.bonusConsumoFragmento.subscribe((b) => bonus.push(b));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(0); // "TESTE"
      alvo.fixture.componentInstance['atributoConsumoFragmento'].set('vontade');
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(bonus).toEqual([{ opcao: expect.objectContaining({ tipo: 'TESTE' }), atributoEscolhido: 'vontade' }]);
    });

    it('emite fragmentoConsumido incondicionalmente, com o módulo e o texto do bônus escolhido (m3-64)', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.I)], amplificadores: [] });
      const registros: FichaFragmentoConsumidoDto[] = [];
      alvo.fixture.componentInstance.fragmentoConsumido.subscribe((r) => registros.push(r));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(0); // "TESTE"
      alvo.fixture.componentInstance['atributoConsumoFragmento'].set('intelecto');
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      // Módulo I: preço físico extra = 20 × 3 = 60; nada a restituir da aquisição (P-016) → delta −60.
      expect(registros).toEqual([
        {
          modulo: FragmentoModuloEnum.I,
          bonusEscolhido: '+5 em todos os testes de Intelecto e +1 ponto no atributo',
          opcao: {
            rotulo: '+5 em todos os testes do atributo à escolha e +1 ponto no atributo',
            tipo: 'TESTE',
            valor: 5,
            concedePontoAtributo: true,
            pontosAtributo: 1,
          },
          atributoEscolhido: 'intelecto',
          deltaEnergiaMaxima: -60,
          item: fragmento(FragmentoModuloEnum.I),
        },
      ]);
    });

    it('módulo I: bônus de teste carrega concedePontoAtributo, e a descrição da sequela menciona o ponto de atributo', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.I)], amplificadores: [] });
      const sequelas: (readonly { descricao?: string }[])[] = [];
      alvo.fixture.componentInstance.sequelasFragmentoConsumido.subscribe((s) => sequelas.push(s));

      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(0); // "TESTE"
      alvo.fixture.componentInstance['atributoConsumoFragmento'].set('intelecto');
      alvo.fixture.componentInstance['confirmarConsumirFragmento'](0);

      expect(sequelas[0][0].descricao).toBe(
        'Fragmento Potencializador Módulo I consumido — +5 em todos os testes de Intelecto e +1 ponto no atributo',
      );
    });

    it('trocar a opção de bônus (via <select>) zera o atributo escolhido anteriormente', () => {
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.III)], amplificadores: [] });
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['escolherOpcaoConsumoFragmento']({ target: { value: '0' } } as unknown as Event);
      alvo.fixture.componentInstance['atributoConsumoFragmento'].set('vontade');

      alvo.fixture.componentInstance['escolherOpcaoConsumoFragmento']({ target: { value: '1' } } as unknown as Event);

      expect(alvo.fixture.componentInstance['atributoConsumoFragmento']()).toBeNull();
    });

    it('reabrir o painel (abrirConsumirFragmento) zera a opção e o atributo escolhidos', () => {
      const alvo = montar(
        { itens: [fragmento(FragmentoModuloEnum.III), fragmento(FragmentoModuloEnum.V)], amplificadores: [] },
      );
      alvo.fixture.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.componentInstance['opcaoConsumoFragmento'].set(0);
      alvo.fixture.componentInstance['atributoConsumoFragmento'].set('vontade');

      alvo.fixture.componentInstance['abrirConsumirFragmento'](1);

      expect(alvo.fixture.componentInstance['opcaoConsumoFragmento']()).toBeNull();
      expect(alvo.fixture.componentInstance['atributoConsumoFragmento']()).toBeNull();
    });
  });

  describe('Afinidade — redução de custo de fragmentos acima de 10 (m3-42/m3-49)', () => {
    /** Monta um fragmento avulso de um módulo, com a quantidade dada (default 1). */
    function fragmento(modulo: FragmentoModuloEnum, quantidade = 1): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('adquirir um fragmento **considera o próprio módulo** na Afinidade (retroativa) — reduz o custo da própria compra', () => {
      // 3 Potencializador de módulo I já portados (Afinidade 15) + o novo módulo I sendo comprado
      // agora (+5) = 20. Precisa ser Construtor: desde o P-016 só ele paga Energia ao adquirir — um
      // Potencializador sempre custaria 0, sem nada pra Afinidade reduzir.
      const alvo = montar({
        itens: [fragmento(FragmentoModuloEnum.I, 3)],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      // Afinidade 20 → redução −5 (floor((20-10)/2)); custo base Construtor módulo I = 40 → 35.
      // 50 − 35 = 15.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 15 }]);
    });

    /** Registro mínimo de `fragmentosConsumidos` (m3-64) — só `modulo` importa pra Afinidade (P-015). */
    function registroConsumido(modulo: FragmentoModuloEnum): FichaFragmentoConsumidoDto {
      return {
        modulo,
        bonusEscolhido: '+1 em Defesa',
        opcao: { rotulo: '+1 em Defesa', tipo: 'DEFESA', valor: 1 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: 0,
        item: fragmento(modulo),
      };
    }

    it('fragmentos já consumidos também contam pra Afinidade (P-015), mesmo fora do inventário', () => {
      // 3 já consumidos de módulo I (Afinidade 15) + o novo Construtor módulo I sendo comprado
      // agora (+5) = 20 — mesma conta de "adquirir considera o próprio módulo" acima, só com
      // Afinidade vinda do histórico de consumo em vez do inventário. Precisa ser Construtor pelo
      // mesmo motivo do teste acima (P-016: Potencializador não paga nada ao adquirir).
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentRef.setInput('fragmentosConsumidos', [
        registroConsumido(FragmentoModuloEnum.I),
        registroConsumido(FragmentoModuloEnum.I),
        registroConsumido(FragmentoModuloEnum.I),
      ]);
      alvo.fixture.detectChanges();
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      // Afinidade 20 → redução −5 (floor((20-10)/2)); custo base Construtor módulo I = 40 → 35.
      // 50 − 35 = 15.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 15 }]);
    });

    it('a Afinidade nunca reduz o custo abaixo de 1 (piso do doc), mesmo muito acima de 10', () => {
      // 6 já portados de módulo I (Afinidade 30) + o novo Construtor módulo V sendo comprado agora
      // (+1) = 31. Precisa ser Construtor (P-016) — só ele tem custo de aquisição pra reduzir.
      const alvo = montar({ itens: [fragmento(FragmentoModuloEnum.I, 6)], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      // Custo base do Construtor módulo V é 6 (3 × 2); a redução (−10) o levaria a −4, mas o piso é
      // 1. 50 − 1 = 49.
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 49 }]);
    });

    it('remover um fragmento restitui a Afinidade ATUAL (retroativa) — pode ser menos do que foi pago na compra', () => {
      // 3 Potencializador de módulo I já portados (Afinidade 15) + o Construtor módulo I sendo
      // removido, também módulo I (+5) = 20. Redução −5 → restitui 35 (40 − 5), não os 40 cheios
      // que teriam sido cobrados sem nenhum outro fragmento. Precisa ser Construtor (P-016) — só
      // ele tem algo a restituir.
      const construtor: CarrinhoItemDto = {
        ...fragmento(FragmentoModuloEnum.I),
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      };
      const alvo = montar({
        itens: [fragmento(FragmentoModuloEnum.I, 3), construtor],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['confirmarRemocaoItem'](1);

      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 85 }]);
    });

    it('acoplar um Potencializador sob Afinidade alta reduz os dois lados igualmente — único débito de Energia Máxima desde o P-016', () => {
      // 3 de módulo I já portados (Afinidade 15) + o próprio fragmento sendo acoplado, módulo IV
      // (+2) = 17. Redução −3: acoplamento debitado 7 → 4 dos dois lados.
      const alvo = montar({
        itens: [
          itemLeve,
          fragmento(FragmentoModuloEnum.I, 3),
          fragmento(FragmentoModuloEnum.IV),
        ],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['abrirAplicarFragmento'](2);
      alvo.fixture.componentInstance['alvoFragmento'].set(0);
      alvo.fixture.componentInstance['opcaoBonusFragmento'].set(0);
      alvo.fixture.componentInstance['confirmarAplicarFragmento'](2);

      // Energia atual e Energia Máxima debitadas igualmente, já reduzidas (7 → 4 dos dois lados) —
      // desde o P-016 não há mais restituição de aquisição pra compensar a Energia Máxima.
      expect(custos).toEqual([{ energiaAtual: 46, energiaMaxima: 46 }]);
    });

    it('desacoplar sob Afinidade alta reduz o custo de remoção e restitui por completo o acoplamento reduzido', () => {
      const itemComFragmento: CarrinhoItemDto = {
        ...itemLeve,
        modificacoes: [
          {
            nome: 'Fragmento Potencializador — Módulo IV',
            empilhamentos: 1,
            efeitos: [{ tipo: ModificacaoEfeitoTipoEnum.RESISTENCIA, valor: 3 }],
            ignoraLimiteTotal: true,
            ignoraLimiteProprio: true,
            origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.IV },
          },
        ],
      };
      // 3 de módulo I soltos (Afinidade 15) + o módulo IV acoplado (+2) = 17. Redução −3.
      const alvo = montar({
        itens: [itemComFragmento, fragmento(FragmentoModuloEnum.I, 3)],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['removerModificacao'](0, 'Fragmento Potencializador — Módulo IV');

      // Remover módulo IV custaria 14 sem redução; com −3 vira 11. Energia Máxima: restitui o
      // acoplamento já reduzido (7 → 4) por completo — desde o P-016 nada continua drenando depois
      // que o fragmento volta a ser avulso.
      expect(custos).toEqual([{ energiaAtual: 39, energiaMaxima: 54 }]);
    });
  });

  describe('form de item custom — Fragmento Construtor vs Potencializador é explicado (m3-42)', () => {
    it('categoria Fragmento Construtor: explica que ele é a peça em si', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentInstance['alternarCriarItem']();
      alvo.fixture.componentInstance['itemCustomForm'].controls.categoria.setValue(
        ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
      );
      alvo.fixture.detectChanges();

      expect(alvo.raiz.querySelector('.ficha-inv__aviso')?.textContent).toContain('é a peça em si');
    });

    it('categoria Fragmento Potencializador: explica que ele melhora outro item', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentInstance['alternarCriarItem']();
      alvo.fixture.componentInstance['itemCustomForm'].controls.categoria.setValue(
        ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
      );
      alvo.fixture.detectChanges();

      expect(alvo.raiz.querySelector('.ficha-inv__aviso')?.textContent).toContain('melhora outro item');
    });
  });

  // `atributos`: Vigor 4, Destreza 2 → limite mínimo (4+2)×2 = 12 (doc — "⬦ Limite mínimo de
  // Energia"). `energiaMaxima` default do `montar` é 50.
  describe('aviso de Limite mínimo de Energia na aquisição de Fragmento (m3-67)', () => {
    it('sem módulo escolhido ainda: sem aviso', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentInstance['alternarCriarItem']();
      alvo.fixture.componentInstance['itemCustomForm'].controls.categoria.setValue(
        ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
      );
      alvo.fixture.detectChanges();

      expect(alvo.componentInstance['avisoLimiteEnergiaAquisicao']()).toBeNull();
      expect(alvo.raiz.textContent).not.toContain('Anomalia Biológica');
    });

    it('módulo cujo custo não leva abaixo do limite: sem aviso', () => {
      // Potencializador módulo V custa 3 de Energia Máxima: 50 − 3 = 47, bem acima de 12.
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentInstance['alternarCriarItem']();
      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.detectChanges();

      expect(alvo.componentInstance['avisoLimiteEnergiaAquisicao']()).toBeNull();
      expect(alvo.raiz.textContent).not.toContain('Anomalia Biológica');
    });

    it('Fragmento Construtor módulo I (custa o dobro, 40): projeta 10 — abaixo do limite (12), mostra o aviso sem travar', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.fixture.componentInstance['alternarCriarItem']();
      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        categoria: ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR,
        modulo: FragmentoModuloEnum.I,
      });
      alvo.fixture.detectChanges();

      expect(alvo.componentInstance['limiteMinimoEnergia']()).toBe(12);
      expect(alvo.componentInstance['avisoLimiteEnergiaAquisicao']()).toEqual({ projecao: 10 });
      const aviso = Array.from(alvo.raiz.querySelectorAll('.ficha-inv__aviso')).find((p) =>
        p.textContent?.includes('Anomalia Biológica'),
      );
      expect(aviso?.textContent).toContain('10');
      expect(aviso?.textContent).toContain('12');

      // Não trava: confirmar o item ainda funciona normalmente.
      alvo.fixture.componentInstance['itemCustomForm'].controls.nome.setValue('Fragmento achado');
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));
      alvo.fixture.componentInstance['confirmarCriarItem']();
      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 10 }]);
    });
  });

  describe('catálogo — atalho "Fragmentos" (grade de módulos, botões Construtor/Potencializador direto)', () => {
    it('a aba "Fragmentos" aparece nas categorias do catálogo, ao lado das demais', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      fixture.detectChanges();
      const botao = Array.from(raiz.querySelectorAll('.ficha-inv__categoria')).find(
        (b) => b.textContent?.trim() === 'Fragmentos',
      );
      expect(botao).toBeTruthy();
    });

    it('clicar em "Fragmentos" mostra a grade de módulos em vez do catálogo comprável — ordem V → I', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      fixture.detectChanges();
      componentInstance['selecionarCategoriaFragmentos']();
      fixture.detectChanges();

      const cartoes = Array.from(raiz.querySelectorAll('.ficha-inv__cartao--fragmento'));
      const afinidades = cartoes.map((c) => c.querySelector('.ficha-inv__tag')?.textContent?.trim());
      expect(afinidades).toEqual(['Afinidade +1', 'Afinidade +2', 'Afinidade +3', 'Afinidade +4', 'Afinidade +5']);
    });

    it('cada cartão tem os dois botões — Construtor e Potencializador — direto, sem passo intermediário', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      fixture.detectChanges();

      const primeiroCartao = raiz.querySelector('.ficha-inv__cartao--fragmento');
      const botoes = Array.from(primeiroCartao?.querySelectorAll('.ficha-inv__cartao-acoes .ficha-inv__btn') ?? []).map(
        (b) => b.textContent?.trim(),
      );
      expect(botoes).toEqual(['+ Potencializador', '+ Construtor']);
    });

    it('clicar "+ Construtor" num módulo fecha o catálogo e abre o item custom com categoria e módulo pré-preenchidos', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      componentInstance['escolherTipoFragmento'](FragmentoModuloEnum.III, FragmentoTipoEnum.CONSTRUTOR);
      fixture.detectChanges();

      expect(componentInstance['catalogoAberto']()).toBe(false);
      expect(componentInstance['criandoItem']()).toBe(true);
      const form = componentInstance['itemCustomForm'].getRawValue();
      expect(form.categoria).toBe(ItemCategoriaEnum.FRAGMENTO_CONSTRUTOR);
      expect(form.modulo).toBe(FragmentoModuloEnum.III);
      expect(raiz.querySelector('.ficha-inv__form')).toBeTruthy();
    });

    it('clicar "+ Potencializador" pré-preenche a categoria correspondente', () => {
      const { componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      componentInstance['escolherTipoFragmento'](FragmentoModuloEnum.V, FragmentoTipoEnum.POTENCIALIZADOR);

      const form = componentInstance['itemCustomForm'].getRawValue();
      expect(form.categoria).toBe(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR);
      expect(form.modulo).toBe(FragmentoModuloEnum.V);
    });

    it('trocar pra outra categoria do catálogo sai da grade de Fragmentos', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      componentInstance['definirCategoria'](ItemCategoriaEnum.CORPO_A_CORPO);
      fixture.detectChanges();

      expect(componentInstance['catalogoFragmentosAtivo']()).toBe(false);
      expect(raiz.querySelector('.ficha-inv__cartao--fragmento')).toBeNull();
    });
  });

  describe('custo já reduzido pela Afinidade (m3-66)', () => {
    function fragmento(categoria: ItemCategoriaEnum, modulo: FragmentoModuloEnum): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo,
      };
    }

    it('catálogo de Fragmentos: Afinidade zero mostra só o custo (sem riscado — bruto e reduzido coincidem)', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [], amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      fixture.detectChanges();

      const cartoes = Array.from(raiz.querySelectorAll('.ficha-inv__cartao--fragmento'));
      expect(cartoes.length).toBe(5);
      expect(cartoes.every((c) => c.querySelector('.ficha-inv__custo--bruto') === null)).toBe(true);
      const cartaoV = cartoes.find((c) =>
        c.querySelector('.ficha-inv__cartao-nome')?.textContent?.trim().startsWith('Módulo V'),
      )!;
      expect(cartaoV.textContent).toContain('3 Energia');
    });

    it('catálogo de Fragmentos: Afinidade alta (30, acima de 6× módulo I) mostra o reduzido em destaque e o bruto riscado', () => {
      const itens: CarrinhoItemDto[] = [
        { ...fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.I), quantidade: 6 },
      ];
      const { raiz, fixture, componentInstance } = montar({ itens, amplificadores: [] });
      componentInstance['alternarCatalogo']();
      componentInstance['selecionarCategoriaFragmentos']();
      fixture.detectChanges();

      const cartaoV = Array.from(raiz.querySelectorAll('.ficha-inv__cartao--fragmento')).find((c) =>
        c.querySelector('.ficha-inv__cartao-nome')?.textContent?.trim().startsWith('Módulo V'),
      )!;
      const [linhaPotencializador, linhaConstrutor] = Array.from(
        cartaoV.querySelectorAll('.ficha-inv__cartao-fragmento-custo'),
      );
      // Módulo V: aquisição bruta 3 (Potencializador) / 6 (Construtor, dobro). Afinidade já
      // considerando o próprio módulo V (30 dos 6× módulo I + 1 do V = 31) reduz em 10 — piso 1.
      expect(linhaPotencializador.querySelector('.ficha-inv__custo--bruto')?.textContent?.trim()).toBe('3');
      expect(linhaPotencializador.textContent).toContain('1 Energia');
      expect(linhaConstrutor.querySelector('.ficha-inv__custo--bruto')?.textContent?.trim()).toBe('6');
      expect(linhaConstrutor.textContent).toContain('1 Energia');
    });

    it('painel "Aplicar em...": mostra o custo de Energia (e a Energia Máxima líquida) antes de confirmar', () => {
      const alvo = montar({
        itens: [itemLeve, fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirAplicarFragmento'](1);
      alvo.fixture.detectChanges();

      // Módulo IV: acoplar custa 7 de Energia + 7 de Energia Máxima — desde o P-016 esse é o único
      // débito (mesma conta do teste de confirmação), sem restituição de aquisição pra compensar.
      expect(alvo.componentInstance['custoPreviaAplicarFragmento']()).toEqual({ energia: 7, energiaMaxima: -7 });
      expect(alvo.raiz.textContent).toContain('Custo já com a Afinidade atual: −7 de Energia agora');
      expect(alvo.raiz.textContent).toContain('Energia Máxima líquida: -7');
    });

    it('painel "Aplicar em...": some com o painel fechado (custoPreviaAplicarFragmento null)', () => {
      const alvo = montar({
        itens: [itemLeve, fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      expect(alvo.componentInstance['custoPreviaAplicarFragmento']()).toBeNull();
    });

    it('painel "Consumir": mostra a restituição da aquisição e o líquido de Energia Máxima antes de confirmar (módulo III)', () => {
      const alvo = montar({
        itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.III)],
        amplificadores: [],
      });
      alvo.componentInstance['abrirConsumirFragmento'](0);
      alvo.fixture.detectChanges();

      // Módulo III: nada a restituir da aquisição (P-016 — o Potencializador nunca custou nada
      // solto); Preço de Sanidade físico = 36 (12 × 3); líquido = 0 − 36 = −36 (mesma conta do
      // teste de confirmação, m3-42).
      expect(alvo.componentInstance['custoPreviaConsumirFragmento']()).toEqual({
        restituicaoAquisicao: 0,
        deltaEnergiaMaxima: -36,
      });
      expect(alvo.raiz.textContent).toContain('+0 de Energia Máxima restituída da aquisição');
      expect(alvo.raiz.textContent).toContain('líquido -36 de Energia Máxima');
    });

    it('painel "Consumir": some com o painel fechado (custoPreviaConsumirFragmento null)', () => {
      const alvo = montar({
        itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.III)],
        amplificadores: [],
      });
      expect(alvo.componentInstance['custoPreviaConsumirFragmento']()).toBeNull();
    });
  });

  describe('apresentacao="dialog" (card de Status, redesenho de comparação visual)', () => {
    it('aplica a classe compacta na raiz só no modo dialog', () => {
      const { raiz, fixture } = montar({ itens: [itemLeve], amplificadores: [] });
      expect(raiz.querySelector('.ficha-inv')?.classList.contains('ficha-inv--compacto')).toBe(false);
      fixture.componentRef.setInput('apresentacao', 'dialog');
      fixture.detectChanges();
      expect(raiz.querySelector('.ficha-inv')?.classList.contains('ficha-inv--compacto')).toBe(true);
    });

    it('no modo dialog, abrir o painel "Modificar" de um item fecha o de outro (só um por vez)', () => {
      const outroItem: CarrinhoItemDto = { ...itemLeve, nome: 'Outra Leve' };
      const alvo = montar({ itens: [itemLeve, outroItem], amplificadores: [] });
      alvo.fixture.componentRef.setInput('apresentacao', 'dialog');
      alvo.fixture.detectChanges();

      alvo.componentInstance['alternarPainel'](0);
      expect(alvo.componentInstance['itensInventario']()[0].painelAberto).toBe(true);
      expect(alvo.componentInstance['itensInventario']()[1].painelAberto).toBe(false);

      alvo.componentInstance['alternarPainel'](1);
      expect(alvo.componentInstance['itensInventario']()[0].painelAberto).toBe(false);
      expect(alvo.componentInstance['itensInventario']()[1].painelAberto).toBe(true);
    });

    it('no modo inline (padrão), vários painéis "Modificar" podem ficar abertos ao mesmo tempo', () => {
      const outroItem: CarrinhoItemDto = { ...itemLeve, nome: 'Outra Leve' };
      const alvo = montar({ itens: [itemLeve, outroItem], amplificadores: [] });

      alvo.componentInstance['alternarPainel'](0);
      alvo.componentInstance['alternarPainel'](1);
      expect(alvo.componentInstance['itensInventario']()[0].painelAberto).toBe(true);
      expect(alvo.componentInstance['itensInventario']()[1].painelAberto).toBe(true);
    });

    it('fecharCatalogo/fecharPainelDialog fecham o estado usado pelo `onHide` dos p-dialogs', () => {
      const alvo = montar({ itens: [itemLeve], amplificadores: [] });
      alvo.componentInstance['alternarCatalogo']();
      expect(alvo.componentInstance['catalogoAberto']()).toBe(true);
      alvo.componentInstance['fecharCatalogo']();
      expect(alvo.componentInstance['catalogoAberto']()).toBe(false);

      alvo.componentInstance['alternarPainel'](0);
      alvo.componentInstance['alternarCriarMod'](0);
      alvo.componentInstance['fecharPainelDialog']();
      expect(alvo.componentInstance['itensInventario']()[0].painelAberto).toBe(false);
      expect(alvo.componentInstance['criandoModIndice']()).toBeNull();
    });
  });

  describe('sub-inventários próprios — Pochete/Bolso de Corpo (m3-44)', () => {
    function municao(quantidade = 1): CarrinhoItemDto {
      return {
        nome: '9mm',
        categoria: ItemCategoriaEnum.MUNICOES,
        custo: 100,
        peso: 0.5,
        quantidade,
        guardada: false,
        modificacoes: [],
      };
    }

    it('adicionar uma Pochete do catálogo atribui um `id` estável ao item', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['definirCategoria'](ItemCategoriaEnum.ARMAZENAMENTO);
      const cartao = alvo.fixture.componentInstance['itensCatalogo']().find((c) => c.item.nome === 'Pochete')!;
      alvo.fixture.componentInstance['adicionarItem'](cartao);

      expect(alvo.emitidos[0].itens).toHaveLength(1);
      expect(typeof alvo.emitidos[0].itens[0].id).toBe('string');
      expect(alvo.emitidos[0].itens[0].id).not.toBe('');
    });

    it('uma Mochila comum (sem inventário próprio) não ganha `id`', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      alvo.componentInstance['definirCategoria'](ItemCategoriaEnum.ARMAZENAMENTO);
      const cartao = alvo.fixture.componentInstance['itensCatalogo']().find((c) => c.item.nome === 'Mochila Pequena')!;
      alvo.fixture.componentInstance['adicionarItem'](cartao);

      expect(alvo.emitidos[0].itens[0].id).toBeUndefined();
    });

    it('Pochete vestida abre sua própria seção, com capacidade e restrição de categoria', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const { raiz } = montar({ itens: [pochete, municao(3)], amplificadores: [] });

      const secao = raiz.querySelector('.ficha-inv__subinventario');
      expect(secao).not.toBeNull();
      expect(secao?.textContent).toContain('Pochete');
      expect(secao?.textContent).toContain('Munições');
    });

    it('um item com `containerId` some da lista principal e aparece dentro da seção do container', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const dentro: CarrinhoItemDto = { ...municao(2), containerId: 'poch-1' };
      const { raiz, componentInstance } = montar({ itens: [pochete, dentro, itemLeve], amplificadores: [] });

      // A munição guardada na Pochete não entra na lista principal (só "Leve" e a Pochete aparecem lá).
      expect(componentInstance['itensListaPrincipal']().map((item) => item.nome)).toEqual(['Leve', 'Pochete']);
      const secao = raiz.querySelector('.ficha-inv__subinventario');
      expect(secao?.textContent).toContain('9mm');
    });

    it('mover um item para a Pochete grava o `containerId`; mover de volta remove o campo', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const alvo = montar({ itens: [pochete, municao()], amplificadores: [] });

      alvo.componentInstance['moverItemParaContainer'](1, 'poch-1');
      expect(alvo.emitidos[0].itens[1].containerId).toBe('poch-1');

      alvo.componentInstance['moverItemParaContainer'](1, null);
      expect(alvo.emitidos[1].itens[1].containerId).toBeUndefined();
    });

    /**
     * Bug reportado: "tenho quatro itens na pochete, quero remover dois pro inventário principal" —
     * o único caminho era `escolherContainer` movendo o item inteiro (stack completo) de uma vez,
     * sem opção de mover só parte das unidades. Mesmo padrão do dialog "quantos remover" (stack de
     * quantidade > 1), agora reusado pra "quantos mover".
     */
    it('escolher um destino diferente com item empilhado (quantidade > 1) abre o diálogo de quantidade em vez de mover tudo direto', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const alvo = montar({ itens: [pochete, municao(4)], amplificadores: [] });

      alvo.componentInstance['escolherContainer'](1, 'poch-1');

      expect(alvo.emitidos).toEqual([]);
      expect(alvo.componentInstance['moverQuantidadePendente']()).toEqual({ indice: 1, containerId: 'poch-1' });
    });

    it('confirmar o diálogo com uma quantidade parcial divide o stack: parte fica no container de origem, parte vai pro destino', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const dentro: CarrinhoItemDto = { ...municao(4), containerId: 'poch-1' };
      const alvo = montar({ itens: [pochete, dentro], amplificadores: [] });

      alvo.componentInstance['escolherContainer'](1, null);
      alvo.componentInstance['quantidadeMover'].setValue(2);
      alvo.componentInstance['confirmarMoverQuantidade']();

      const itens = alvo.emitidos[0].itens;
      expect(itens).toHaveLength(3);
      expect(itens[1]).toMatchObject({ nome: '9mm', quantidade: 2, containerId: 'poch-1' });
      expect(itens[2]).toMatchObject({ nome: '9mm', quantidade: 2 });
      expect(itens[2].containerId).toBeUndefined();
      expect(alvo.componentInstance['moverQuantidadePendente']()).toBeNull();
    });

    it('confirmar o diálogo com a quantidade total move o stack inteiro (sem sobrar entrada vazia)', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const alvo = montar({ itens: [pochete, municao(4)], amplificadores: [] });

      alvo.componentInstance['escolherContainer'](1, 'poch-1');
      alvo.componentInstance['confirmarMoverQuantidade']();

      const itens = alvo.emitidos[0].itens;
      expect(itens).toHaveLength(2);
      expect(itens[1]).toMatchObject({ nome: '9mm', quantidade: 4, containerId: 'poch-1' });
    });

    it('escolher o mesmo destino atual (ou item de quantidade 1) move direto, sem abrir o diálogo', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const alvo = montar({ itens: [pochete, municao()], amplificadores: [] });

      alvo.componentInstance['escolherContainer'](1, 'poch-1');

      expect(alvo.emitidos[0].itens[1].containerId).toBe('poch-1');
      expect(alvo.componentInstance['moverQuantidadePendente']()).toBeNull();
    });

    it('o menu "Mover para" (popover próprio, não `<select>` nativo) reflete o container atual e move ao clicar numa opção', () => {
      const pochete: CarrinhoItemDto = {
        nome: 'Pochete',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 200,
        peso: 0.2,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'poch-1',
      };
      const alvo = montar({ itens: [pochete, municao()], amplificadores: [] });

      // Não há mais `<select>` nativo pra essa ação.
      expect(alvo.raiz.querySelector('select.ficha-inv__mover-entrada')).toBeNull();

      const gatilho = alvo.raiz.querySelector('.ficha-inv__mover-gatilho') as HTMLButtonElement;
      expect(gatilho.textContent).toContain('Inventário principal');

      gatilho.click();
      alvo.fixture.detectChanges();
      const opcoes = Array.from(alvo.raiz.querySelectorAll('.ficha-inv__mover-opcao'));
      const opcaoPochete = opcoes.find((el) => el.textContent?.includes('Pochete')) as HTMLButtonElement;
      opcaoPochete.click();
      alvo.fixture.detectChanges();

      expect(alvo.emitidos[0].itens[1].containerId).toBe('poch-1');
      // O menu fecha ao escolher, e a próxima renderização mostra o container escolhido.
      expect(alvo.raiz.querySelector('.ficha-inv__mover-lista')).toBeNull();
    });

    // Doc — "Bolso de Corpo": "Apenas pode aplicar a modificação Bolso Tático".
    it('"Bolso de Corpo" só oferece a modificação "Bolso Tático" no painel "Modificar"', () => {
      const bolso: CarrinhoItemDto = {
        nome: 'Bolso de Corpo',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 75,
        peso: 0.1,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        id: 'bolso-1',
      };
      const alvo = montar({ itens: [bolso], amplificadores: [] });
      alvo.componentInstance['alternarPainel'](0);
      alvo.fixture.detectChanges();

      const nomesMod = Array.from(alvo.raiz.querySelectorAll('.ficha-inv__mod-entrada-nome')).map((el) => el.textContent?.trim());
      expect(nomesMod).toEqual(['Bolso Tático']);
    });

    it('um Bolso de Corpo guardado (não vestido) não abre seção de sub-inventário', () => {
      const bolsoGuardado: CarrinhoItemDto = {
        nome: 'Bolso de Corpo',
        categoria: ItemCategoriaEnum.ARMAZENAMENTO,
        custo: 75,
        peso: 0.1,
        quantidade: 1,
        guardada: true,
        modificacoes: [],
        id: 'bolso-1',
      };
      const { raiz } = montar({ itens: [bolsoGuardado], amplificadores: [] });
      expect(raiz.querySelector('.ficha-inv__subinventario')).toBeNull();
    });
  });

  describe('Fragmentos em seção própria (m3-44)', () => {
    function fragmentoAvulso(): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo: FragmentoModuloEnum.IV,
      };
    }

    it('um Fragmento não aparece na lista principal — só na seção própria de Fragmentos', () => {
      const { componentInstance } = montar({ itens: [itemLeve, fragmentoAvulso()], amplificadores: [] });
      expect(componentInstance['itensListaPrincipal']().map((item) => item.nome)).toEqual(['Leve']);
      expect(componentInstance['itensListaFragmentos']().map((item) => item.nome)).toEqual(['Fragmento achado']);
    });

    it('renderiza a seção "Fragmentos" com o item dentro, com header separado da lista principal', () => {
      const { raiz } = montar({ itens: [fragmentoAvulso()], amplificadores: [] });
      const secoes = Array.from(raiz.querySelectorAll('.ficha-inv__amps-cabecalho')).map((el) => el.textContent?.trim());
      expect(secoes.some((texto) => texto === 'Fragmentos')).toBe(true);
    });
  });

  describe('Amplificadores em grade de 2 colunas (m3-44)', () => {
    it('a lista de amplificadores (filtro "Amplificadores") usa a grade de 2 colunas', () => {
      const { raiz, fixture, componentInstance } = montar({
        itens: [],
        amplificadores: [{ nome: 'Vida', empilhamentos: 1 }],
      });
      componentInstance['selecionarFiltroInventario']('amplificadores');
      fixture.detectChanges();

      const grade = raiz.querySelector('.ficha-inv__grade-amps');
      expect(grade).not.toBeNull();
      expect(grade?.querySelectorAll('.ficha-inv__item--amp').length).toBe(1);
    });
  });

  describe('Filtro de visualização do Inventário (controle segmentado Equipamentos/Amplificadores/Fragmentos)', () => {
    function fragmentoAvulso(): CarrinhoItemDto {
      return {
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        custo: 0,
        peso: 0,
        quantidade: 1,
        guardada: false,
        modificacoes: [],
        modulo: FragmentoModuloEnum.IV,
      };
    }

    /** Localiza o botão pelo nome acessível, que permanece por extenso nos dois viewports. */
    function botaoFiltro(raiz: HTMLElement, rotulo: string): HTMLButtonElement {
      return Array.from(raiz.querySelectorAll('.ficha-inv__filtro-item')).find(
        (b) => b.getAttribute('aria-label') === rotulo,
      ) as HTMLButtonElement;
    }

    it('começa em "Equipamentos" (mostra tudo) por padrão', () => {
      const { componentInstance } = montar({ itens: [itemLeve], amplificadores: [] });
      expect(componentInstance['filtroInventario']()).toBe('equipamentos');
      expect(componentInstance['mostrandoSoAmplificadores']()).toBe(false);
      expect(componentInstance['mostrandoSoFragmentos']()).toBe(false);
    });

    it('selecionar "fragmentos" esconde os demais itens e mostra só a seção de Fragmentos', () => {
      const { raiz, fixture, componentInstance } = montar({
        itens: [itemLeve, fragmentoAvulso()],
        amplificadores: [],
      });
      componentInstance['selecionarFiltroInventario']('fragmentos');
      fixture.detectChanges();

      expect(raiz.textContent).not.toContain('Leve');
      const cabecalhos = Array.from(raiz.querySelectorAll('.ficha-inv__amps-cabecalho')).map((el) =>
        el.textContent?.trim(),
      );
      expect(cabecalhos).toEqual(['Fragmentos']);
    });

    it('sem fragmentos no inventário, o filtro "fragmentos" mostra a mensagem de vazio', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [itemLeve], amplificadores: [] });
      componentInstance['selecionarFiltroInventario']('fragmentos');
      fixture.detectChanges();

      expect(raiz.textContent).toContain('Nenhum fragmento no inventário.');
    });

    it('é um controle de 3 opções — só uma fica ativa por vez (sem estado combinado possível)', () => {
      const { componentInstance } = montar({
        itens: [fragmentoAvulso()],
        amplificadores: [{ nome: 'Vida', empilhamentos: 1 }],
      });

      componentInstance['selecionarFiltroInventario']('amplificadores');
      expect(componentInstance['mostrandoSoAmplificadores']()).toBe(true);
      expect(componentInstance['mostrandoSoFragmentos']()).toBe(false);

      componentInstance['selecionarFiltroInventario']('fragmentos');
      expect(componentInstance['mostrandoSoFragmentos']()).toBe(true);
      expect(componentInstance['mostrandoSoAmplificadores']()).toBe(false);

      componentInstance['selecionarFiltroInventario']('equipamentos');
      expect(componentInstance['mostrandoSoAmplificadores']()).toBe(false);
      expect(componentInstance['mostrandoSoFragmentos']()).toBe(false);
    });

    it('mantém o filtro ao lado das ações de adição e expõe rótulos compactos no mobile', () => {
      const { raiz, fixture, componentInstance } = montar({ itens: [fragmentoAvulso()], amplificadores: [] });
      expect(botaoFiltro(raiz, 'Equipamentos')).toBeTruthy();
      expect(botaoFiltro(raiz, 'Amplificadores')).toBeTruthy();
      expect(botaoFiltro(raiz, 'Fragmentos')).toBeTruthy();
      expect(botaoFiltro(raiz, 'Equipamentos').closest('.ficha-inv__acoes')?.querySelector('.ficha-inv__btn--principal'))
        .toBeTruthy();
      expect(botaoFiltro(raiz, 'Equipamentos').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
        .toBe('Equip.');
      expect(botaoFiltro(raiz, 'Amplificadores').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
        .toBe('Amplif.');
      expect(botaoFiltro(raiz, 'Fragmentos').querySelector('.ficha-inv__filtro-texto--mobile')?.textContent)
        .toBe('Frag.');

      botaoFiltro(raiz, 'Fragmentos').click();
      fixture.detectChanges();

      expect(botaoFiltro(raiz, 'Fragmentos').getAttribute('aria-pressed')).toBe('true');
      expect(botaoFiltro(raiz, 'Equipamentos').getAttribute('aria-pressed')).toBe('false');
      expect(componentInstance['filtroInventario']()).toBe('fragmentos');
    });

    it('ancora o grupo de filtros à direita da barra de adição no desktop', () => {
      const { raiz } = montar({ itens: [fragmentoAvulso()], amplificadores: [] });
      const filtro = raiz.querySelector('.ficha-inv__filtro') as HTMLElement;

      expect(getComputedStyle(filtro).marginInlineStart).toBe('auto');
    });
  });

  describe('podeRolar (m3-51) — rolar dano da arma (m3-45) gated', () => {
    it('rolarDanoItem não rola sem podeRolar mesmo com danoFormula presente', () => {
      const { componentInstance, mostrar } = montar(
        { itens: [itemLeve], amplificadores: [] },
        true,
        100,
        false,
      );
      componentInstance['rolarDanoItem']({
        nomeExibido: 'Leve',
        danoFormula: '2d6',
      } as never);
      expect(mostrar).not.toHaveBeenCalled();
    });

    it('rolarDanoItem rola quando podeRolar (mesmo sem editavel — rolar não é edição)', () => {
      const { componentInstance, mostrar } = montar(
        { itens: [itemLeve], amplificadores: [] },
        false,
        100,
        true,
      );
      componentInstance['rolarDanoItem']({
        nomeExibido: 'Leve',
        danoFormula: '2d6',
      } as never);
      expect(mostrar).toHaveBeenCalledOnce();
      expect(mostrar.mock.calls[0][0].formula).toBe('2d6');
    });
  });
});
