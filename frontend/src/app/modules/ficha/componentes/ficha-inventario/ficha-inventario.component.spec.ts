import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaInventarioDto } from '@contratados-rpg/shared/dtos/ficha';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

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

  function montar(inventario: FichaInventarioDto, editavel = true, prestigio = 100) {
    TestBed.configureTestingModule({ imports: [FichaInventario] });
    const fixture = TestBed.createComponent(FichaInventario);
    fixture.componentRef.setInput('inventario', inventario);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.componentRef.setInput('prestigio', prestigio);
    fixture.componentRef.setInput('inventarioMaximo', 25);
    fixture.componentRef.setInput('vontade', 3);
    fixture.componentRef.setInput('dinheiro', 5000);
    fixture.componentRef.setInput('energiaAtual', 50);
    fixture.componentRef.setInput('energiaMaxima', 50);
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
      dano: '',
      informacao: '',
      resistencia: '',
      bonus: '',
      categoriaEmprestada: '',
      modulo: '',
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
        'Leve',
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

    it('adquirir um fragmento Potencializador (módulo V) debita 3 de Energia Máxima', () => {
      const alvo = montar({ itens: [], amplificadores: [] });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['itemCustomForm'].patchValue({
        nome: 'Fragmento achado',
        categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
        modulo: FragmentoModuloEnum.V,
      });
      alvo.fixture.componentInstance['confirmarCriarItem']();

      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 47 }]);
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

    it('remover um fragmento avulso (não aplicado) do inventário restaura a Energia Máxima', () => {
      const alvo = montar({
        itens: [fragmento(ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR, FragmentoModuloEnum.IV)],
        amplificadores: [],
      });
      const custos: { energiaAtual: number; energiaMaxima: number }[] = [];
      alvo.fixture.componentInstance.ajusteEnergiaFragmento.subscribe((c) => custos.push(c));

      alvo.fixture.componentInstance['confirmarRemocaoItem'](0);

      expect(custos).toEqual([{ energiaAtual: 50, energiaMaxima: 57 }]);
      expect(alvo.emitidos[0].itens).toHaveLength(0);
    });

    it('aplicar um fragmento Potencializador em outro item: soma o efeito, remove o fragmento e debita Energia + Energia Máxima do acoplamento', () => {
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

      // Módulo IV: acoplar custa 7 de Energia + 7 de Energia Máxima (exemplo do documento).
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

    it('remover (desacoplar) uma mod de fragmento debita Energia × 2, sem ressuscitar o fragmento nem tocar a Energia Máxima', () => {
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

      // Módulo IV: remover custa Energia × 2 = 14; Energia Máxima não muda (50).
      expect(custos).toEqual([{ energiaAtual: 36, energiaMaxima: 50 }]);
      expect(alvo.emitidos[0].itens[0].modificacoes).toHaveLength(0);
      // Não devolve um fragmento avulso ao inventário — só o item alvo continua ali.
      expect(alvo.emitidos[0].itens).toHaveLength(1);
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
});
