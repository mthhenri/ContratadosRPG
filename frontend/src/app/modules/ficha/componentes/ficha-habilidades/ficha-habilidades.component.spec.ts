import { TestBed } from '@angular/core/testing';
import { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum } from '@contratados-rpg/shared/enums';
import type { FichaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaHabilidades } from './ficha-habilidades.component';

/**
 * Prova o editor no próprio lugar da aba Habilidades (m3-13): adicionar/editar/remover a lista única
 * de habilidades. Controlado — cada mutação emite a **lista inteira** por `habilidadesMudou`; custo
 * variável persiste `null` e exibe `[X E]`; sem trava de regra (liberdade total, m3-10).
 */
describe('FichaHabilidades', () => {
  const habilidades: FichaHabilidadeDto[] = [
    { nome: 'Tiro Certeiro', categoria: HabilidadeCategoriaEnum.CLASSE, custoEnergia: 2, descricao: 'Mira.' },
    { nome: 'Sobrecarga', categoria: HabilidadeCategoriaEnum.ARQUETIPO, custoEnergia: null, descricao: '' },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [FichaHabilidades] });
    const fixture = TestBed.createComponent(FichaHabilidades);
    fixture.componentRef.setInput('habilidades', habilidades);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
    fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
    fixture.componentRef.setInput('energiaAtual', 20);
    fixture.detectChanges();
    const emitidos: (readonly FichaHabilidadeDto[])[] = [];
    const utilizados: number[] = [];
    fixture.componentInstance.habilidadesMudou.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.habilidadeUtilizada.subscribe((c) => utilizados.push(c));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos, utilizados };
  }

  it('é só leitura quando não editável: lista os itens sem botões de ação', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.habilidades__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Tiro Certeiro', 'Sobrecarga']);
    // Custo variável renderizado como [X E]; chip com o rótulo legível da categoria.
    const custos = Array.from(raiz.querySelectorAll('.habilidades__custo')).map((n) => n.textContent?.trim());
    expect(custos).toEqual(['[2 E]', '[X E]']);
    const chips = Array.from(raiz.querySelectorAll('.habilidades__chip')).map((n) => n.textContent?.trim());
    expect(chips).toEqual(['Classe', 'Arquétipo']);
    expect(raiz.querySelector('.habilidades__add')).toBeNull();
    expect(raiz.querySelector('.habilidades__acao')).toBeNull();
  });

  it('adiciona uma habilidade e emite a lista com o novo item (nome/descrição aparados)', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['habilidadeForm'].setValue({
      nome: '  Investida  ',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: 1,
      variavel: false,
      descricao: '  Avança.  ',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([
      ...habilidades,
      { nome: 'Investida', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 1, descricao: 'Avança.' },
    ]);
  });

  it('não emite ao confirmar sem nome (forma inválida)', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['habilidadeForm'].patchValue({ nome: '', custoEnergia: 3 });
    alvo.fixture.componentInstance['confirmar']();
    expect(alvo.emitidos).toHaveLength(0);
  });

  it('edita uma habilidade existente e emite a substituição', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['editar'](0);
    alvo.fixture.componentInstance['habilidadeForm'].patchValue({ nome: 'Tiro Preciso', custoEnergia: 4 });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      { nome: 'Tiro Preciso', categoria: HabilidadeCategoriaEnum.CLASSE, custoEnergia: 4, descricao: 'Mira.' },
      habilidades[1],
    ]);
  });

  it('custo variável persiste como null (ignora o valor do stepper)', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['habilidadeForm'].setValue({
      nome: 'Adaptação',
      categoria: HabilidadeCategoriaEnum.CIVIL,
      custoEnergia: 7,
      variavel: true,
      descricao: '',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0].at(-1)).toEqual({
      nome: 'Adaptação',
      categoria: HabilidadeCategoriaEnum.CIVIL,
      custoEnergia: null,
      descricao: '',
    });
  });

  it('ao editar um custo variável semeia a caixa "variável" marcada', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['editar'](1); // Sobrecarga, custo null
    expect(alvo.fixture.componentInstance['habilidadeForm'].controls.variavel.value).toBe(true);
  });

  it('stepper de custo trava no piso 0', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    componente['adicionar']();
    componente['habilidadeForm'].controls.custoEnergia.setValue(1);
    componente['ajustarCusto'](-1);
    componente['ajustarCusto'](-1);
    expect(componente['habilidadeForm'].controls.custoEnergia.value).toBe(0);
  });

  it('remove uma habilidade só após a confirmação inline', () => {
    const alvo = montar(true);
    // Pedir a remoção não emite nada ainda.
    alvo.fixture.componentInstance['pedirRemocao'](0);
    expect(alvo.emitidos).toHaveLength(0);
    // Confirmar remove e emite a lista sem o item.
    alvo.fixture.componentInstance['remover'](0);
    expect(alvo.emitidos[0]).toEqual([habilidades[1]]);
  });

  it('escolher do catálogo pré-preenche o editor com a origem e grava-a ao salvar', () => {
    const alvo = montar(true);
    // Simula a escolha de uma habilidade de classe de OUTRA classe (Especialista).
    alvo.fixture.componentInstance['aoEscolherDoCatalogo']({
      nome: 'Hacker',
      categoria: HabilidadeCategoriaEnum.CLASSE,
      custoEnergia: 0,
      descricao: 'Acessa sistemas.',
      origem: ClasseEnum.ESPECIALISTA,
    });
    // O editor abriu pré-preenchido (índice de adição).
    expect(alvo.fixture.componentInstance['habilidadeForm'].controls.nome.value).toBe('Hacker');
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0].at(-1)).toEqual({
      nome: 'Hacker',
      categoria: HabilidadeCategoriaEnum.CLASSE,
      custoEnergia: 0,
      descricao: 'Acessa sistemas.',
      origem: ClasseEnum.ESPECIALISTA,
    });
  });

  it('o chip nomeia a origem quando é de outra classe/arquétipo; a própria fica sem nome', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    // Classe da ficha (Combatente) → só "Classe".
    expect(
      componente['rotuloChip']({ nome: 'x', categoria: HabilidadeCategoriaEnum.CLASSE, custoEnergia: 0, descricao: '', origem: ClasseEnum.COMBATENTE }),
    ).toBe('Classe');
    // Outra classe → "Classe - Especialista".
    expect(
      componente['rotuloChip']({ nome: 'x', categoria: HabilidadeCategoriaEnum.CLASSE, custoEnergia: 0, descricao: '', origem: ClasseEnum.ESPECIALISTA }),
    ).toBe('Classe - Especialista');
    // Outro arquétipo → "Arquétipo - Mercenário".
    expect(
      componente['rotuloChip']({ nome: 'x', categoria: HabilidadeCategoriaEnum.ARQUETIPO, custoEnergia: 0, descricao: '', origem: ArquetipoEnum.MERCENARIO }),
    ).toBe('Arquétipo - Mercenário');
  });

  it('Utilizar de custo fixo emite o custo direto', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['utilizar'](0, habilidades[0]); // custo 2
    expect(alvo.utilizados).toEqual([2]);
  });

  it('Utilizar de custo variável abre o mini-campo e emite o valor digitado', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['utilizar'](1, habilidades[1]); // custo null
    expect(alvo.utilizados).toHaveLength(0); // ainda não gastou
    alvo.fixture.componentInstance['custoVariavel'].setValue(5);
    alvo.fixture.componentInstance['confirmarUtilizarVariavel']();
    expect(alvo.utilizados).toEqual([5]);
  });
});
