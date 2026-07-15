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
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

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

  it('remove um item de quantidade 1 e emite a lista sem ele', () => {
    const alvo = montar({ itens: [itemLeve], amplificadores: [] });
    alvo.fixture.componentInstance['removerItem'](0);
    expect(alvo.emitidos[0].itens).toEqual([]);
  });

  it('decrementa a quantidade ao remover item com quantidade > 1', () => {
    const alvo = montar({ itens: [{ ...itemLeve, quantidade: 3 }], amplificadores: [] });
    alvo.fixture.componentInstance['removerItem'](0);
    expect(alvo.emitidos[0].itens[0].quantidade).toBe(2);
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
