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

  it('adicionar do catálogo grava direto na ficha (com a origem), sem abrir o editor', () => {
    const alvo = montar(true);
    // Simula a escolha de uma habilidade de classe de OUTRA classe (Especialista).
    alvo.fixture.componentInstance['aoAdicionarDoCatalogo']({
      nome: 'Hacker',
      categoria: HabilidadeCategoriaEnum.CLASSE,
      custoEnergia: 0,
      descricao: 'Acessa sistemas.',
      origem: ClasseEnum.ESPECIALISTA,
    });
    // Emitiu direto — nada de editor aberto.
    expect(alvo.fixture.componentInstance['indiceEmEdicao']()).toBeNull();
    expect(alvo.emitidos[0].at(-1)).toEqual({
      nome: 'Hacker',
      categoria: HabilidadeCategoriaEnum.CLASSE,
      custoEnergia: 0,
      descricao: 'Acessa sistemas.',
      origem: ClasseEnum.ESPECIALISTA,
    });
  });

  it('preserva o custo variável (null) ao adicionar do catálogo', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['aoAdicionarDoCatalogo']({
      nome: 'Adaptação',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: null,
      descricao: '',
    });
    expect(alvo.emitidos[0].at(-1)).toEqual({
      nome: 'Adaptação',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: null,
      descricao: '',
    });
  });

  it('remover do catálogo (o "✕" do "Na ficha") tira a habilidade pelo nome', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['aoRemoverDoCatalogo']('Tiro Certeiro');
    expect(alvo.emitidos[0]).toEqual([habilidades[1]]);
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

  it('Utilizar fica desabilitado para habilidade de 0 E e não gasta nem no pointerdown; ativo p/ custo > 0', () => {
    TestBed.configureTestingModule({ imports: [FichaHabilidades] });
    const fixture = TestBed.createComponent(FichaHabilidades);
    fixture.componentRef.setInput('habilidades', [
      { nome: 'Passiva', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 0, descricao: '' },
      { nome: 'Ativa', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 3, descricao: '' },
    ] as FichaHabilidadeDto[]);
    fixture.componentRef.setInput('editavel', true);
    fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
    fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
    fixture.componentRef.setInput('energiaAtual', 20);
    fixture.detectChanges();
    const utilizados: number[] = [];
    fixture.componentInstance.habilidadeUtilizada.subscribe((c) => utilizados.push(c));

    const botoes = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.habilidades__utilizar'),
    ) as HTMLButtonElement[];
    expect(botoes[0].disabled).toBe(true); // 0 E
    expect(botoes[1].disabled).toBe(false); // 3 E

    // O atributo `disabled` só barra o `click`; o `pointerdown` ainda chega — o guard do handler
    // é que impede o gasto. Dispara direto no elemento e prova que nada foi gasto.
    const evento = new Event('pointerdown', { bubbles: true }) as Event & { button: number; pointerId: number };
    evento.button = 0;
    evento.pointerId = 1;
    botoes[0].dispatchEvent(evento);
    expect(utilizados).toEqual([]);
  });

  /**
   * Prova o HOLD no **botão renderizado de verdade** (não no método): dispara `pointerdown` no
   * elemento `.habilidades__utilizar` e avança o relógio — o gasto deve se repetir a cada 300ms e
   * parar no `pointerup`. Pega quebras de fiação (binding do evento) que o teste de método não pega.
   */
  it('segurar o botão Utilizar repete o gasto a cada 100ms e para ao soltar', () => {
    vi.useFakeTimers();
    try {
      const alvo = montar(true);
      const botao = alvo.raiz.querySelector('.habilidades__utilizar') as HTMLElement;
      expect(botao).not.toBeNull();
      const disparar = (tipo: string): void => {
        const evento = new Event(tipo, { bubbles: true }) as Event & { button: number; pointerId: number };
        evento.button = 0;
        evento.pointerId = 1;
        botao.dispatchEvent(evento);
      };

      disparar('pointerdown'); // gasto imediato + inicia o hold
      expect(alvo.utilizados).toEqual([2]);
      vi.advanceTimersByTime(100);
      expect(alvo.utilizados).toEqual([2, 2]); // 1º repeat
      vi.advanceTimersByTime(100);
      expect(alvo.utilizados).toEqual([2, 2, 2]); // 2º repeat

      disparar('pointerup'); // solta: para a repetição
      vi.advanceTimersByTime(1200);
      expect(alvo.utilizados).toEqual([2, 2, 2]); // nada mais gasta
    } finally {
      vi.useRealTimers();
    }
  });

  it('um clique de mouse (pointerdown+pointerup+click) gasta uma única vez', () => {
    vi.useFakeTimers();
    try {
      const alvo = montar(true);
      const botao = alvo.raiz.querySelector('.habilidades__utilizar') as HTMLElement;
      const disparar = (tipo: string, detail = 0): void => {
        const evento = new Event(tipo, { bubbles: true }) as Event & { button: number; pointerId: number; detail: number };
        evento.button = 0;
        evento.pointerId = 1;
        evento.detail = detail;
        botao.dispatchEvent(evento);
      };
      disparar('pointerdown'); // gasta
      disparar('pointerup'); // para o hold
      disparar('click', 1); // clique de mouse (detail>0) — ignorado, sem duplicar
      vi.advanceTimersByTime(600);
      expect(alvo.utilizados).toEqual([2]);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * Amplificador `Conservador` (doc — "⬡ Amplificadores": "-1 de Energia em custos de habilidades,
   * mínimo 1") — desconta o custo exibido e o efetivamente debitado; custo variável (`[X E]`) fica
   * de fora (o jogador já digita o valor exato que quer gastar).
   */
  describe('Amplificador Conservador — desconto no custo de Energia', () => {
    function montarComConservador(empilhamentos = 1) {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', habilidades);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.componentRef.setInput('amplificadores', [{ nome: 'Conservador', empilhamentos }]);
      fixture.detectChanges();
      const utilizados: number[] = [];
      fixture.componentInstance.habilidadeUtilizada.subscribe((c) => utilizados.push(c));
      return { fixture, raiz: fixture.nativeElement as HTMLElement, utilizados };
    }

    it('desconta -1 no custo exibido (Tiro Certeiro [2 E] → [1 E]), custo variável intacto ([X E])', () => {
      const { raiz } = montarComConservador();
      const custos = Array.from(raiz.querySelectorAll('.habilidades__custo')).map((n) => n.textContent?.trim());
      expect(custos).toEqual(['[1 E]', '[X E]']);
    });

    it('debita o custo já descontado ao Utilizar', () => {
      const alvo = montarComConservador();
      alvo.fixture.componentInstance['utilizar'](0, habilidades[0]); // custo base 2
      expect(alvo.utilizados).toEqual([1]);
    });

    it('nunca reduz abaixo de 1 (mínimo do doc), mesmo com custo base 1', () => {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      const habilidadeCustoUm: FichaHabilidadeDto = {
        nome: 'Foco',
        categoria: HabilidadeCategoriaEnum.GERAL,
        custoEnergia: 1,
        descricao: '',
      };
      fixture.componentRef.setInput('habilidades', [habilidadeCustoUm]);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.componentRef.setInput('amplificadores', [{ nome: 'Conservador', empilhamentos: 1 }]);
      fixture.detectChanges();
      const utilizados: number[] = [];
      fixture.componentInstance.habilidadeUtilizada.subscribe((c) => utilizados.push(c));
      fixture.componentInstance['utilizar'](0, habilidadeCustoUm);
      expect(utilizados).toEqual([1]);
    });

    it('habilidade sem custo (0 E) permanece 0 — não vira "mínimo 1"', () => {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      const habilidadeGratis: FichaHabilidadeDto = {
        nome: 'Passiva',
        categoria: HabilidadeCategoriaEnum.GERAL,
        custoEnergia: 0,
        descricao: '',
      };
      fixture.componentRef.setInput('habilidades', [habilidadeGratis]);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.componentRef.setInput('amplificadores', [{ nome: 'Conservador', empilhamentos: 1 }]);
      fixture.detectChanges();
      const custo = fixture.nativeElement.querySelector('.habilidades__custo')?.textContent?.trim();
      expect(custo).toBe('[0 E]');
    });

    it('sem Conservador portado (input padrão, []), custo não muda (mesmo comportamento de antes)', () => {
      const { raiz } = montar(true);
      const custos = Array.from(raiz.querySelectorAll('.habilidades__custo')).map((n) => n.textContent?.trim());
      expect(custos).toEqual(['[2 E]', '[X E]']);
    });
  });

  /**
   * m3-48: contadores por tipo no resumo ficam clicáveis e o filtro é **cumulativo** — cada clique
   * soma um tipo à seleção; clicar de novo no mesmo tipo o tira; somar os 4 tipos limpa tudo
   * (equivalente a "todos"). O botão vassoura (`&__limpar-filtro`, ícone só, alinhado à direita na
   * própria linha do resumo, logo depois de "Outras classes/arquétipos") só aparece com algum tipo
   * ativo e limpa a seleção inteira. Estado de UI volátil (nenhum campo novo em `dados`).
   */
  describe('filtro cumulativo por tipo pelo contador do resumo (m3-48)', () => {
    // 1 habilidade por bucket, na ordem em que aparecem na lista (preserva a ordem original).
    const habilidadesCompletas: FichaHabilidadeDto[] = [
      { nome: 'Golpe de Classe', categoria: HabilidadeCategoriaEnum.CLASSE, custoEnergia: 1, descricao: '' },
      { nome: 'Salto de Arquétipo', categoria: HabilidadeCategoriaEnum.ARQUETIPO, custoEnergia: 0, descricao: '' },
      { nome: 'Primeiros Socorros', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 1, descricao: '' },
      { nome: 'Técnica Emprestada', categoria: HabilidadeCategoriaEnum.OUTRA_CLASSE, custoEnergia: 2, descricao: '' },
    ];

    function montarCompleta() {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', habilidadesCompletas);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.detectChanges();
      return { fixture, raiz: fixture.nativeElement as HTMLElement };
    }

    function botaoResumo(raiz: HTMLElement, rotulo: string): HTMLButtonElement {
      const botoes = Array.from(raiz.querySelectorAll('.habilidades__resumo-item')) as HTMLButtonElement[];
      const alvo = botoes.find((b) => b.querySelector('.habilidades__resumo-rotulo')?.textContent?.trim() === rotulo);
      if (!alvo) {
        throw new Error(`Botão de resumo "${rotulo}" não encontrado`);
      }
      return alvo;
    }

    function nomes(raiz: HTMLElement): (string | undefined)[] {
      return Array.from(raiz.querySelectorAll('.habilidades__nome')).map((n) => n.textContent?.trim());
    }

    it('clicar no contador de Arquétipo filtra a lista para só as de Arquétipo', () => {
      const { raiz, fixture } = montarCompleta();
      botaoResumo(raiz, 'Arquétipo').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Salto de Arquétipo']);
    });

    it('clicar no contador de Geral filtra também as GERAL_MELHORADA (mesmo bucket)', () => {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', [
        ...habilidadesCompletas,
        { nome: 'Luta (cheio)', categoria: HabilidadeCategoriaEnum.GERAL_MELHORADA, custoEnergia: 1, descricao: '', origem: ArquetipoEnum.LUTADOR },
      ]);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.detectChanges();
      const raiz = fixture.nativeElement as HTMLElement;

      expect(botaoResumo(raiz, 'Geral').querySelector('.habilidades__resumo-valor')?.textContent?.trim()).toBe('2');

      botaoResumo(raiz, 'Geral').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Primeiros Socorros', 'Luta (cheio)']);
    });

    it('clicar em Classe depois de Arquétipo soma os dois tipos (cumulativo)', () => {
      const { raiz, fixture } = montarCompleta();
      botaoResumo(raiz, 'Arquétipo').click();
      fixture.detectChanges();
      botaoResumo(raiz, 'Classe').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Golpe de Classe', 'Salto de Arquétipo']);
    });

    it('clicar de novo no mesmo tipo só tira aquele da seleção (mantém os demais)', () => {
      const { raiz, fixture } = montarCompleta();
      botaoResumo(raiz, 'Arquétipo').click();
      botaoResumo(raiz, 'Classe').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Golpe de Classe', 'Salto de Arquétipo']);

      botaoResumo(raiz, 'Classe').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Salto de Arquétipo']);
    });

    it('selecionar os 4 tipos limpa tudo (equivalente a "todos")', () => {
      const { raiz, fixture } = montarCompleta();
      botaoResumo(raiz, 'Arquétipo').click();
      botaoResumo(raiz, 'Classe').click();
      botaoResumo(raiz, 'Geral').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toHaveLength(3); // ainda faltam "Outras classes/arquétipos"

      botaoResumo(raiz, 'Outras classes/arquétipos').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(habilidadesCompletas.map((h) => h.nome)); // limpou: mostra tudo
      for (const rotulo of ['Arquétipo', 'Classe', 'Geral', 'Outras classes/arquétipos']) {
        expect(botaoResumo(raiz, rotulo).getAttribute('aria-pressed')).toBe('false');
      }
    });

    it('o(s) contador(es) ativo(s) têm aria-pressed="true"; os demais, "false"', () => {
      const { raiz, fixture } = montarCompleta();
      const botaoClasse = botaoResumo(raiz, 'Classe');
      const botaoArquetipo = botaoResumo(raiz, 'Arquétipo');
      expect(botaoClasse.getAttribute('aria-pressed')).toBe('false');

      botaoClasse.click();
      fixture.detectChanges();
      expect(botaoClasse.getAttribute('aria-pressed')).toBe('true');
      expect(botaoArquetipo.getAttribute('aria-pressed')).toBe('false');

      botaoArquetipo.click();
      fixture.detectChanges();
      expect(botaoClasse.getAttribute('aria-pressed')).toBe('true');
      expect(botaoArquetipo.getAttribute('aria-pressed')).toBe('true');
    });

    it('o botão vassoura só aparece com algum filtro ativo, e limpa tudo ao clicar', () => {
      const { raiz, fixture } = montarCompleta();
      expect(raiz.querySelector('.habilidades__limpar-filtro')).toBeNull();

      botaoResumo(raiz, 'Arquétipo').click();
      fixture.detectChanges();
      const vassoura = raiz.querySelector('.habilidades__limpar-filtro') as HTMLButtonElement;
      expect(vassoura).not.toBeNull();

      vassoura.click();
      fixture.detectChanges();
      expect(raiz.querySelector('.habilidades__limpar-filtro')).toBeNull();
      expect(nomes(raiz)).toEqual(habilidadesCompletas.map((h) => h.nome));
    });

    /** Cada contador leva a cor do próprio tipo (glow verde/âmbar/azul/accent — não um accent uniforme). */
    it('cada contador carrega o modificador de cor do próprio tipo', () => {
      const { raiz } = montarCompleta();
      expect(botaoResumo(raiz, 'Arquétipo').classList.contains('habilidades__resumo-item--arquetipo')).toBe(true);
      expect(botaoResumo(raiz, 'Classe').classList.contains('habilidades__resumo-item--classe')).toBe(true);
      expect(botaoResumo(raiz, 'Geral').classList.contains('habilidades__resumo-item--geral')).toBe(true);
      expect(botaoResumo(raiz, 'Outras classes/arquétipos').classList.contains('habilidades__resumo-item--outra-classe')).toBe(true);
    });

    function dispararContextMenu(botao: HTMLButtonElement): Event {
      const evento = new Event('contextmenu', { bubbles: true, cancelable: true });
      botao.dispatchEvent(evento);
      return evento;
    }

    it('clique direito num contador ativo o remove da seleção (sem alternar os demais)', () => {
      const { raiz, fixture } = montarCompleta();
      botaoResumo(raiz, 'Arquétipo').click();
      botaoResumo(raiz, 'Classe').click();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Golpe de Classe', 'Salto de Arquétipo']);

      dispararContextMenu(botaoResumo(raiz, 'Arquétipo'));
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Golpe de Classe']);
      expect(botaoResumo(raiz, 'Arquétipo').getAttribute('aria-pressed')).toBe('false');
      expect(botaoResumo(raiz, 'Classe').getAttribute('aria-pressed')).toBe('true');
    });

    it('clique direito num contador já sem filtro não faz nada (no-op) e suprime o menu nativo', () => {
      const { raiz, fixture } = montarCompleta();
      const evento = dispararContextMenu(botaoResumo(raiz, 'Geral'));
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(habilidadesCompletas.map((h) => h.nome)); // nada mudou
      expect(evento.defaultPrevented).toBe(true); // menu de contexto do browser não abre
    });

    it('sem resultado nos tipos filtrados, mostra a mensagem de vazio juntando os rótulos com "ou"', () => {
      const { raiz, fixture } = montar(true); // fixture original: só Classe e Arquétipo
      botaoResumo(raiz, 'Geral').click();
      botaoResumo(raiz, 'Outras classes/arquétipos').click();
      fixture.detectChanges();
      const vazio = raiz.querySelector('.habilidades__vazio')?.textContent?.trim();
      expect(vazio).toBe('Nenhuma habilidade de Geral ou Outra classe/arquétipo.');
    });
  });

  /**
   * P-014: o bucket do resumo que hoje se chama "Arquétipo" vira "Subclasse" numa ficha Experimento
   * — mesmo critério de `classeBaseDeHabilidades` usado pelo resto da ficha (chip por item, rótulo
   * da aba do seletor). A categoria `SUBCLASSE` (as habilidades de subclasse propriamente ditas)
   * soma nesse mesmo bucket — antes ficava de fora da contagem inteira.
   */
  describe('rótulo do bucket "Arquétipo"/"Subclasse" do resumo (P-014)', () => {
    function montarExperimento(habilidadesExperimento: readonly FichaHabilidadeDto[]) {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', habilidadesExperimento);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.EXPERIMENTO_BESTIAL);
      fixture.componentRef.setInput('arquetipo', null);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.detectChanges();
      return { fixture, raiz: fixture.nativeElement as HTMLElement };
    }

    it('numa ficha Experimento, o resumo mostra "Subclasse" em vez de "Arquétipo"', () => {
      const { raiz } = montarExperimento([
        { nome: 'Instinto Bestial', categoria: HabilidadeCategoriaEnum.SUBCLASSE, custoEnergia: 0, descricao: '' },
      ]);
      const rotulos = Array.from(raiz.querySelectorAll('.habilidades__resumo-rotulo')).map((n) => n.textContent?.trim());
      expect(rotulos).toContain('Subclasse');
      expect(rotulos).not.toContain('Arquétipo');
    });

    it('numa ficha de classe base, o resumo continua "Arquétipo"', () => {
      const { raiz } = montar(true); // fixture padrão do describe pai: COMBATENTE/LUTADOR
      const rotulos = Array.from(raiz.querySelectorAll('.habilidades__resumo-rotulo')).map((n) => n.textContent?.trim());
      expect(rotulos).toContain('Arquétipo');
      expect(rotulos).not.toContain('Subclasse');
    });

    it('uma habilidade categoria SUBCLASSE conta no bucket "Subclasse" (antes ficava fora da contagem)', () => {
      const { raiz, fixture } = montarExperimento([
        { nome: 'Instinto Bestial', categoria: HabilidadeCategoriaEnum.SUBCLASSE, custoEnergia: 0, descricao: '' },
        { nome: 'Primeiros Socorros', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 1, descricao: '' },
      ]);
      const botao = Array.from(raiz.querySelectorAll('.habilidades__resumo-item')).find(
        (b) => b.querySelector('.habilidades__resumo-rotulo')?.textContent?.trim() === 'Subclasse',
      ) as HTMLButtonElement;
      expect(botao.querySelector('.habilidades__resumo-valor')?.textContent?.trim()).toBe('1');

      botao.click();
      fixture.detectChanges();
      const nomesFiltrados = Array.from(raiz.querySelectorAll('.habilidades__nome')).map((n) => n.textContent?.trim());
      expect(nomesFiltrados).toEqual(['Instinto Bestial']);
    });
  });

  /**
   * Follow-up do P-014: no diálogo "Adicionar do sistema", Subclasse e Arquétipo viraram abas
   * separadas (antes eram uma só, com o rótulo trocando de nome) — reflete a distinção que
   * `catalogoHabilidades` (`shared/regras`) já resolve em dois grupos (`grupoSubclasse`/
   * `grupoArquetipo`).
   */
  describe('diálogo "Adicionar do sistema": Subclasse e Arquétipo como abas separadas (P-014 follow-up)', () => {
    it('numa ficha Experimento, o seletor mostra as duas abas ao mesmo tempo', () => {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', []);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.EXPERIMENTO_BESTIAL);
      fixture.componentRef.setInput('arquetipo', null);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.detectChanges();
      const raiz = fixture.nativeElement as HTMLElement;

      fixture.componentInstance['abrirSeletor']();
      fixture.detectChanges();

      const rotulosAba = Array.from(raiz.querySelectorAll('.seletor__aba')).map((aba) => aba.textContent?.trim());
      expect(rotulosAba).toContain('Subclasse');
      expect(rotulosAba).toContain('Arquétipo');
    });

    it('numa ficha de classe base, só a aba Arquétipo aparece (sem Subclasse)', () => {
      TestBed.configureTestingModule({ imports: [FichaHabilidades] });
      const fixture = TestBed.createComponent(FichaHabilidades);
      fixture.componentRef.setInput('habilidades', []);
      fixture.componentRef.setInput('editavel', true);
      fixture.componentRef.setInput('classe', ClasseEnum.COMBATENTE);
      fixture.componentRef.setInput('arquetipo', ArquetipoEnum.LUTADOR);
      fixture.componentRef.setInput('energiaAtual', 20);
      fixture.detectChanges();
      const raiz = fixture.nativeElement as HTMLElement;

      fixture.componentInstance['abrirSeletor']();
      fixture.detectChanges();

      const rotulosAba = Array.from(raiz.querySelectorAll('.seletor__aba')).map((aba) => aba.textContent?.trim());
      expect(rotulosAba).toContain('Arquétipo');
      expect(rotulosAba).not.toContain('Subclasse');
    });
  });
});
