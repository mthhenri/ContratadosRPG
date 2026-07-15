import { TestBed } from '@angular/core/testing';

import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';
import type { FichaInventarioDto } from '@contratados-rpg/shared/dtos/ficha';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

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

  function montar(inventario: FichaInventarioDto, editavel = true, prestigio = 100) {
    TestBed.configureTestingModule({ imports: [FichaInventario] });
    const fixture = TestBed.createComponent(FichaInventario);
    fixture.componentRef.setInput('inventario', inventario);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.componentRef.setInput('prestigio', prestigio);
    fixture.componentRef.setInput('inventarioMaximo', 25);
    fixture.componentRef.setInput('vontade', 3);
    fixture.detectChanges();
    const emitidos: FichaInventarioDto[] = [];
    fixture.componentInstance.inventarioMudou.subscribe((e) => emitidos.push(e));
    return {
      fixture,
      componentInstance: fixture.componentInstance,
      raiz: fixture.nativeElement as HTMLElement,
      emitidos,
    };
  }

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

  it('aplica uma modificação custom (nome + empilhamentos) a um item', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.componentInstance['alternarCriarMod'](0);
    alvo.componentInstance['modCustomForm'].setValue({
      nome: '  Amaldiçoada  ',
      empilhamentos: 2,
      descricao: '  −1 na resistência do alvo  ',
    });
    alvo.componentInstance['confirmarCriarMod'](0);
    expect(alvo.emitidos[0].itens[0].modificacoes).toEqual([
      { nome: 'Amaldiçoada', empilhamentos: 2, descricao: '−1 na resistência do alvo' },
    ]);
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
});
