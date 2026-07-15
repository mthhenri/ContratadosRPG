import { TestBed } from '@angular/core/testing';
import {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  SeveridadeLesaoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaHabilidadeDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularVida } from '@contratados-rpg/shared/regras/agente';

import { FichaVisualizacao } from './ficha-visualizacao.component';

/**
 * Prova a exibição read-only da ficha (m3-07): apresenta identidade (codinome, classe/arquétipo,
 * patente derivada), atributos, estado e os status derivados **via `shared/regras`** (mesma fonte
 * da edição, sem duplicar fórmula) e **não** expõe nenhum controle de formulário (é só leitura).
 */
describe('FichaVisualizacao', () => {
  const dados: FichaJogadorDadosDto = {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: ArquetipoEnum.MERCENARIO,
    nivel: 3,
    prestigio: 1,
    atributos: {
      destreza: 2,
      forca: 3,
      luta: 2,
      pontaria: 1,
      vigor: 4,
      intelecto: 1,
      medicina: 1,
      sentidos: 2,
      social: 1,
      vontade: 2,
    },
    maestria: null,
    estado: {
      vidaAtual: 5,
      energiaAtual: 4,
      sequelas: [{ nome: 'Insônia', descricao: '−1m de deslocamento' }],
      traumas: [{ nome: 'Pânico', descricao: 'Trava 1 turno', tratado: false }],
      lesoes: [],
    },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: 'Veterano de contenção.',
  };

  function montar(documento: FichaJogadorDadosDto, nome = 'Corvo', fichaId = 42, ajustavel = false) {
    TestBed.configureTestingModule({ imports: [FichaVisualizacao] });
    const fixture = TestBed.createComponent(FichaVisualizacao);
    fixture.componentRef.setInput('fichaId', fichaId);
    fixture.componentRef.setInput('nome', nome);
    fixture.componentRef.setInput('dados', documento);
    fixture.componentRef.setInput('ajustavel', ajustavel);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  it('exibe codinome, classe/arquétipo e classificação, e é somente leitura', () => {
    const { raiz } = montar(dados);
    expect(raiz.querySelector('.ficha-ident__nome')?.textContent?.trim()).toBe('Corvo');
    const chips = Array.from(raiz.querySelectorAll('.chip')).map((c) => c.textContent?.trim());
    expect(chips).toContain('Combatente');
    expect(chips).toContain('Mercenário');
    expect(raiz.querySelector('.chip-classificacao')?.textContent?.trim()).toBe('FICHA-JGD-0042');
    // Nenhum controle editável — é a exibição read-only, não o formulário.
    expect(raiz.querySelector('input')).toBeNull();
    expect(raiz.querySelector('select')).toBeNull();
    expect(raiz.querySelector('textarea')).toBeNull();
    expect(raiz.querySelector('app-step-input')).toBeNull();
  });

  it('deriva a Vida Máxima via shared/regras (mesma fonte da edição)', () => {
    const { raiz } = montar(dados);
    const vidaEsperada = calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 3, vigor: 4 });
    const barra = raiz.querySelector('.ficha-barra--vida .ficha-barra__valor')?.textContent ?? '';
    expect(barra.replace(/\s+/g, '')).toBe(`5/${vidaEsperada}`);
  });

  it('mostra a progressão da classe no hover (title) dos rótulos de Vida e Energia', () => {
    const { raiz } = montar(dados);
    const vida = raiz.querySelector('.ficha-barra--vida .ficha-barra__rotulo--dica');
    expect(vida?.getAttribute('title')).toContain('Combatente');
    expect(vida?.getAttribute('title')).toContain('/nível');
    const energia = raiz.querySelector('.ficha-barra--energia .ficha-barra__rotulo--dica');
    expect(energia?.getAttribute('title')).toContain('Energia');
  });

  it('deriva a Patente do Prestígio', () => {
    const { raiz } = montar(dados);
    // Prestígio 1 → patente "Agente".
    const patente = raiz.querySelectorAll('.ficha-mini__valor');
    const textos = Array.from(patente).map((p) => p.textContent?.trim());
    expect(textos).toContain('Agente');
  });

  it('omite o chip de arquétipo quando a ficha não tem (Experimento/Civil)', () => {
    const { raiz } = montar({ ...dados, classe: ClasseEnum.CIVIL, arquetipo: null });
    const chips = Array.from(raiz.querySelectorAll('.chip')).map((c) => c.textContent?.trim());
    expect(chips).toContain('Civil');
    // Só o chip de classe; nenhum chip extra de arquétipo.
    expect(chips.length).toBe(1);
  });

  /** Ativa uma aba clicando no seu `role="tab"` (m3-11). */
  function trocarAba(fixture: ReturnType<typeof montar>['fixture'], aba: string): void {
    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector<HTMLButtonElement>(`#aba-${aba}`)!.click();
    fixture.detectChanges();
  }

  it('lista as marcas de Sanidade (traumas/sequelas) na aba Sanidade', () => {
    const alvo = montar(dados);
    trocarAba(alvo.fixture, 'sanidade');
    expect(alvo.raiz.querySelector('.ficha-cartao__meta')?.textContent).toContain('2 marcas');
    // O editor de Sanidade (m3-12) renderiza as listas; leitura pura (não ajustável) sem controles.
    const marcas = Array.from(alvo.raiz.querySelectorAll('.sanidade__nome')).map((m) =>
      m.textContent?.trim(),
    );
    expect(marcas).toContain('Pânico');
    expect(marcas).toContain('Insônia');
  });

  it('omite o card de anotações quando não há texto', () => {
    const { raiz } = montar({ ...dados, anotacoes: '   ' });
    expect(raiz.textContent).not.toContain('Anotações');
  });

  it('não mostra os passos − / + de Vida/Energia quando não é ajustável (só leitura)', () => {
    const { raiz } = montar(dados);
    expect(raiz.querySelector('.ficha-passo')).toBeNull();
  });

  it('emite o novo valor clampado ao ajustar Vida/Energia quando ajustável', () => {
    // Vida 5, Energia 4; ambos abaixo do máximo → passos livres.
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    const ajustes: { campo: string; valor: number }[] = [];
    fixture.componentInstance.ajusteVitalidade.subscribe((a) => ajustes.push(a));

    // Um toque = pointerdown (passo imediato) + pointerup (encerra o gesto de `appHoldRepeat`).
    const tocar = (botao: HTMLButtonElement) => {
      botao.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
      botao.dispatchEvent(new MouseEvent('pointerup'));
    };
    const passos = raiz.querySelectorAll<HTMLButtonElement>('.ficha-barra--vida .ficha-passo');
    tocar(passos[0]); // −  → 4
    tocar(passos[1]); // +  → 6

    expect(ajustes).toEqual([
      { campo: 'vidaAtual', valor: 4 },
      { campo: 'vidaAtual', valor: 6 },
    ]);
  });

  it('Vida trava só no piso 0: − desabilita em 0, + fica livre (pode exceder a máxima — m3-10)', () => {
    const { raiz } = montar({ ...dados, estado: { ...dados.estado, vidaAtual: 0 } }, 'Corvo', 42, true);
    const [menos, mais] = raiz.querySelectorAll<HTMLButtonElement>('.ficha-barra--vida .ficha-passo');
    expect(menos.disabled).toBe(true);
    expect(mais.disabled).toBe(false);
  });

  it('Energia pode negativar e exceder a máxima: nenhum passo trava (m3-10)', () => {
    const { raiz } = montar({ ...dados, estado: { ...dados.estado, energiaAtual: 0 } }, 'Corvo', 42, true);
    const [menos, mais] = raiz.querySelectorAll<HTMLButtonElement>(
      '.ficha-barra--energia .ficha-passo',
    );
    expect(menos.disabled).toBe(false);
    expect(mais.disabled).toBe(false);
  });

  it('digita o valor direto: Enter confirma sem teto — a atual pode exceder a máxima (m3-10)', () => {
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    const ajustes: { campo: string; valor: number }[] = [];
    fixture.componentInstance.ajusteVitalidade.subscribe((a) => ajustes.push(a));

    // Clica no valor da Vida → abre o campo de digitação.
    raiz.querySelector<HTMLButtonElement>('.ficha-barra--vida .ficha-barra__valor--editavel')!.click();
    fixture.detectChanges();
    const entrada = raiz.querySelector<HTMLInputElement>('.ficha-barra--vida .ficha-barra__entrada');
    expect(entrada).not.toBeNull();

    // Digita acima do máximo → mantém o valor digitado (sem clamp de teto).
    const vidaMaxima = calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 3, vigor: 4 });
    entrada!.value = String(vidaMaxima + 50);
    entrada!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ajustes).toEqual([{ campo: 'vidaAtual', valor: vidaMaxima + 50 }]);
  });

  it('edita a Vida MÁXIMA no próprio lugar (stored) e emite o ajuste (m3-10)', () => {
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    const ajustes: { campo: string; valor: number }[] = [];
    fixture.componentInstance.ajusteVitalidade.subscribe((a) => ajustes.push(a));

    // Na barra de Vida há dois alvos editáveis: [0] atual, [1] máxima.
    const editaveis = raiz.querySelectorAll<HTMLButtonElement>(
      '.ficha-barra--vida .ficha-barra__valor--editavel',
    );
    expect(editaveis.length).toBe(2);
    editaveis[1].click();
    fixture.detectChanges();

    const entrada = raiz.querySelector<HTMLInputElement>('.ficha-barra--vida .ficha-barra__entrada')!;
    entrada.value = '150';
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ajustes).toEqual([{ campo: 'vidaMaxima', valor: 150 }]);
  });

  it('edita um derivado (Informações Extras) e emite o override para persistir', () => {
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    const ajustes: { chave: string; valor: number | string }[] = [];
    fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

    // Clica no valor de uma linha editável (ex.: Deslocamento) → abre o campo.
    const editaveis = raiz.querySelectorAll<HTMLButtonElement>('.ficha-info__editavel');
    expect(editaveis.length).toBeGreaterThan(0);
    editaveis[0].click();
    fixture.detectChanges();

    const entrada = raiz.querySelector<HTMLInputElement>('.ficha-info__entrada')!;
    entrada.value = '99';
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].valor).toBe(99);
  });

  it('exibe o derivado STORED em vez do calculado quando presente', () => {
    const { raiz } = montar(
      { ...dados, derivados: { deslocamento: 42 } },
      'Corvo',
      42,
      false,
    );
    const textoPainel = raiz.querySelector('.ficha-info')?.textContent ?? '';
    // O override (42m) aparece, provando que o stored vence o calculado.
    expect(textoPainel).toContain('42m');
  });

  it('não abre edição de derivado quando não é ajustável (só leitura)', () => {
    const { raiz } = montar(dados);
    expect(raiz.querySelector('.ficha-info__editavel')).toBeNull();
  });

  it('edita atributos em grupo: um lápis abre as dez caixinhas de uma vez', () => {
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    expect(raiz.querySelector('.ficha-atributo--edicao')).toBeNull();

    (raiz.querySelector('.ficha-cartao__lapis') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelectorAll('.ficha-atributo--edicao').length).toBe(10);
    expect(raiz.querySelectorAll('.ficha-atributo__maestria').length).toBe(10);
  });

  it('marca Maestria só em atributo com 6+ e emite atributos + maestria ao salvar', () => {
    const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
    const ajustes: { atributos: { vigor: number }; maestria: string | null }[] = [];
    componente.ajusteAtributos.subscribe((a) => ajustes.push(a));

    componente['editarAtributos']();
    // Vigor 4 → sobe para 6 e habilita a Maestria; Luta (2) segue desabilitada.
    expect(componente['maestriaHabilitada']('vigor')).toBe(false);
    componente['ajustarAtributoRascunho']('vigor', 2);
    expect(componente['maestriaHabilitada']('vigor')).toBe(true);
    expect(componente['maestriaHabilitada']('luta')).toBe(false);
    componente['alternarMaestria']('vigor');
    componente['confirmarAtributos']();

    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].atributos.vigor).toBe(6);
    expect(ajustes[0].maestria).toBe('vigor');
  });

  it('desmarca a Maestria se o atributo cair abaixo de 6 durante a edição', () => {
    const documento = { ...dados, atributos: { ...dados.atributos, forca: 6 }, maestria: 'forca' as const };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;

    componente['editarAtributos']();
    expect(componente['rascunhoMaestria']()).toBe('forca');
    componente['ajustarAtributoRascunho']('forca', -1); // 6 → 5
    expect(componente['rascunhoMaestria']()).toBeNull();
  });

  it('mostra a estrela de Maestria no atributo marcado (leitura)', () => {
    const documento = { ...dados, atributos: { ...dados.atributos, forca: 6 }, maestria: 'forca' as const };
    const { raiz } = montar(documento, 'Corvo', 42, false);
    expect(raiz.querySelector('.ficha-atributo--maestria .ficha-atributo__estrela')).not.toBeNull();
  });

  it('lesão reduz o atributo efetivo exibido (−N) e a Maestria sobrevive (base intacto)', () => {
    const documento = {
      ...dados,
      atributos: { ...dados.atributos, forca: 6 },
      maestria: 'forca' as const,
      estado: {
        ...dados.estado,
        lesoes: [
          { atributo: 'forca' as const, pontos: 1, severidade: SeveridadeLesaoEnum.LEVE, permanente: false },
        ],
      },
    };
    const { raiz } = montar(documento, 'Corvo', 42, false);
    // O box de Força tem Maestria (estrela) E está lesionado; mostra o efetivo 5 e a penalidade −1.
    const box = raiz.querySelector('.ficha-atributo--maestria')!;
    expect(box.classList.contains('ficha-atributo--lesionado')).toBe(true);
    expect(box.querySelector('.ficha-atributo__estrela')).not.toBeNull();
    expect(box.querySelector('.ficha-atributo__valor')?.textContent).toContain('5');
    expect(box.querySelector('.ficha-atributo__lesao')?.textContent?.trim()).toBe('−1');
  });

  it('edita Classe/Arquétipo: trocar para Civil limpa o arquétipo e emite classe + null', () => {
    const documento = { ...dados, classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.MERCENARIO };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;
    const ajustes: { classe: string; arquetipo: string | null }[] = [];
    componente.ajusteClasse.subscribe((a) => ajustes.push(a));

    componente['editarClasse']();
    expect(componente['rascunhoArquetipo']()).toBe(ArquetipoEnum.MERCENARIO);
    // Troca para Civil (sem arquétipo) → o arquétipo do rascunho é limpo.
    componente['mudarClasseRascunho']({ target: { value: ClasseEnum.CIVIL } } as unknown as Event);
    expect(componente['rascunhoArquetipo']()).toBeNull();
    componente['confirmarClasse']();

    expect(ajustes).toEqual([{ classe: ClasseEnum.CIVIL, arquetipo: null }]);
  });

  it('mostra os alvos de edição de identidade (Codinome/Nível/Prestígio) quando ajustável', () => {
    const { raiz } = montar(dados, 'Corvo', 42, true);
    expect(raiz.querySelector('.ficha-ident__nome--editavel')).not.toBeNull();
    // Nível e Prestígio editáveis (a Patente segue derivada, não editável).
    expect(raiz.querySelectorAll('.ficha-mini__valor--editavel').length).toBe(2);
  });

  it('emite os eventos certos ao confirmar Codinome/Nível/Prestígio', () => {
    const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
    const nomes: string[] = [];
    const campos: { campo: string; valor: number }[] = [];
    componente.ajusteNome.subscribe((n) => nomes.push(n));
    componente.ajusteCampoDados.subscribe((c) => campos.push(c));

    componente['editarIdentidade']('nome');
    componente['confirmarIdentidade']('nome', 'Vex');
    componente['editarIdentidade']('nivel');
    componente['confirmarIdentidade']('nivel', '7');
    componente['editarIdentidade']('prestigio');
    componente['confirmarIdentidade']('prestigio', '9');

    expect(nomes).toEqual(['Vex']);
    expect(campos).toEqual([
      { campo: 'nivel', valor: 7 },
      { campo: 'prestigio', valor: 9 },
    ]);
  });

  it('Escape cancela a digitação direta sem emitir alteração', () => {
    const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
    const ajustes: unknown[] = [];
    fixture.componentInstance.ajusteVitalidade.subscribe((a) => ajustes.push(a));

    raiz.querySelector<HTMLButtonElement>('.ficha-barra--energia .ficha-barra__valor--editavel')!.click();
    fixture.detectChanges();
    const entrada = raiz.querySelector<HTMLInputElement>('.ficha-barra--energia .ficha-barra__entrada');
    entrada!.value = '1';
    entrada!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(ajustes).toEqual([]);
    // Volta ao modo leitura do valor (botão editável), sem input aberto.
    expect(raiz.querySelector('.ficha-barra--energia .ficha-barra__entrada')).toBeNull();
  });

  // === Navegação por abas (m3-11) ===

  it('renderiza as seis abas com a Visão Geral ativa por padrão', () => {
    const { raiz } = montar(dados);
    const abas = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(abas.map((a) => a.textContent?.trim())).toEqual([
      'Visão Geral',
      'Combate',
      'Inventário',
      'Habilidades',
      'Sanidade & Lesões',
      'Rolagens',
    ]);
    const ativa = raiz.querySelector('[role="tab"][aria-selected="true"]');
    expect(ativa?.textContent?.trim()).toBe('Visão Geral');
    // O painel da Visão Geral está montado (identidade visível).
    expect(raiz.querySelector('#painel-visao-geral')).not.toBeNull();
    expect(raiz.querySelector('.ficha-ident__nome')?.textContent?.trim()).toBe('Corvo');
  });

  it('troca de aba sem recarregar: a Visão Geral some e o painel de Combate aparece', () => {
    const alvo = montar(dados);
    trocarAba(alvo.fixture, 'combate');
    expect(alvo.raiz.querySelector('#painel-visao-geral')).toBeNull();
    const combate = alvo.raiz.querySelector('#painel-combate');
    expect(combate).not.toBeNull();
    // Combate mostra Defesa/Esquiva/Bloqueio (derivados de combate reorganizados).
    const rotulos = Array.from(combate!.querySelectorAll('.ficha-info__rotulo')).map((r) =>
      r.textContent?.trim(),
    );
    expect(rotulos).toEqual(
      expect.arrayContaining([
        'Defesa',
        'Esquiva',
        'Bloqueio',
        'Deslocamento',
        'Proficiência',
        'Hab. / Turno',
      ]),
    );
  });

  it('realoca Inventário para a aba Inventário e Hab./Turno para Combate (fora de Informações Extras)', () => {
    const alvo = montar(dados);

    // Visão Geral: "Informações Extras" não traz mais Inventário nem Hab. / Turno.
    const gerais = Array.from(
      alvo.raiz.querySelectorAll('#painel-visao-geral .ficha-info__rotulo'),
    ).map((r) => r.textContent?.trim());
    expect(gerais).not.toContain('Inventário');
    expect(gerais).not.toContain('Hab. / Turno');
    // As demais seguem lá (ex.: Percepção).
    expect(gerais).toContain('Percepção');

    // Combate ganhou Hab. / Turno.
    trocarAba(alvo.fixture, 'combate');
    const combate = Array.from(
      alvo.raiz.querySelectorAll('#painel-combate .ficha-info__rotulo'),
    ).map((r) => r.textContent?.trim());
    expect(combate).toContain('Hab. / Turno');

    // Inventário mostra o máximo (derivado realocado) junto do total atual de itens.
    trocarAba(alvo.fixture, 'inventario');
    const inventario = Array.from(
      alvo.raiz.querySelectorAll('#painel-inventario .ficha-info__rotulo'),
    ).map((r) => r.textContent?.trim());
    expect(inventario).toEqual(expect.arrayContaining(['Máximo', 'Itens (atual)', 'Amplificadores']));
  });

  it('edita o Inventário máximo na aba Inventário e emite o override (persistência de m3-10)', () => {
    const alvo = montar(dados, 'Corvo', 42, true);
    const ajustes: { chave: string; valor: number | string }[] = [];
    alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

    trocarAba(alvo.fixture, 'inventario');
    alvo.raiz.querySelector<HTMLButtonElement>('#painel-inventario .ficha-info__editavel')!.click();
    alvo.fixture.detectChanges();

    const entrada = alvo.raiz.querySelector<HTMLInputElement>('#painel-inventario .ficha-info__entrada')!;
    entrada.value = '30';
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ajustes).toEqual([{ chave: 'inventarioMaximo', valor: 30 }]);
  });

  it('emite abaMudou ao clicar numa aba (a página reflete no ?aba= da URL)', () => {
    const { fixture, raiz } = montar(dados);
    const emitidas: string[] = [];
    fixture.componentInstance.abaMudou.subscribe((aba) => emitidas.push(aba));
    raiz.querySelector<HTMLButtonElement>('#aba-habilidades')!.click();
    expect(emitidas).toEqual(['habilidades']);
  });

  it('deep-link: abaInicial semeia a aba ativa (refresh preserva a aba)', () => {
    TestBed.configureTestingModule({ imports: [FichaVisualizacao] });
    const fixture = TestBed.createComponent(FichaVisualizacao);
    fixture.componentRef.setInput('fichaId', 42);
    fixture.componentRef.setInput('nome', 'Corvo');
    fixture.componentRef.setInput('dados', dados);
    fixture.componentRef.setInput('ajustavel', false);
    fixture.componentRef.setInput('abaInicial', 'inventario');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('#painel-inventario')).not.toBeNull();
    expect(raiz.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
      'Inventário',
    );
  });

  it('a aba Habilidades embute o editor (m3-13) e propaga a mutação por ajusteHabilidades', () => {
    const documento: FichaJogadorDadosDto = {
      ...dados,
      habilidades: [
        {
          nome: 'Tiro Certeiro',
          categoria: HabilidadeCategoriaEnum.CLASSE,
          custoEnergia: 2,
          descricao: '',
        },
      ],
    };
    const alvo = montar(documento, 'Corvo', 42, true);
    const emitidas: (readonly FichaHabilidadeDto[])[] = [];
    alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => emitidas.push(h));

    trocarAba(alvo.fixture, 'habilidades');
    // Editor presente com o item existente (chip + custo), não mais o placeholder.
    expect(alvo.raiz.querySelector('.ficha-visao__construcao')).toBeNull();
    expect(alvo.raiz.querySelector('.habilidades__custo')?.textContent?.trim()).toBe('[2 E]');
    expect(alvo.raiz.querySelector('.ficha-cartao__meta')?.textContent).toContain('1 habilidade');

    // Remover propaga a lista nova pela saída do componente.
    alvo.raiz.querySelector<HTMLButtonElement>('.habilidades__acao--remover')!.click();
    alvo.fixture.detectChanges();
    alvo.raiz.querySelector<HTMLButtonElement>('.habilidades__salvar--remover')!.click();
    expect(emitidas).toEqual([[]]);
  });

  it('as abas sem editor mostram aviso "em construção" e o resumo read-only', () => {
    const documento: FichaJogadorDadosDto = {
      ...dados,
      rolagens: [{ nome: 'Ataque', formula: '1d20+PON' }],
    };
    const alvo = montar(documento);

    trocarAba(alvo.fixture, 'rolagens');
    expect(alvo.raiz.querySelector('.ficha-cartao__meta')?.textContent).toContain('1 preset');
    expect(alvo.raiz.textContent).toContain('1d20+PON');
  });

  it('mostra o derivado STORED de combate (Esquiva) quando presente', () => {
    const alvo = montar({ ...dados, derivados: { esquiva: 77 } });
    trocarAba(alvo.fixture, 'combate');
    const combate = alvo.raiz.querySelector('#painel-combate');
    expect(combate?.textContent).toContain('77');
  });

  it('edita Esquiva e Bloqueio no próprio lugar na aba Combate e emite o override', () => {
    const alvo = montar(dados, 'Corvo', 42, true);
    const ajustes: { chave: string; valor: number | string }[] = [];
    alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));
    trocarAba(alvo.fixture, 'combate');

    /** Abre o editor da linha de Combate com esse rótulo e confirma o valor digitado. */
    const editarLinha = (rotulo: string, valor: string): void => {
      const linha = Array.from(
        alvo.raiz.querySelectorAll<HTMLElement>('#painel-combate .ficha-info__linha'),
      ).find((item) => item.querySelector('.ficha-info__rotulo')?.textContent?.trim() === rotulo)!;
      linha.querySelector<HTMLButtonElement>('.ficha-info__editavel')!.click();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>(
        '#painel-combate .ficha-info__entrada',
      )!;
      entrada.value = valor;
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      alvo.fixture.detectChanges();
    };

    editarLinha('Esquiva', '19');
    editarLinha('Bloqueio', '21');

    expect(ajustes).toEqual([
      { chave: 'esquiva', valor: 19 },
      { chave: 'bloqueio', valor: 21 },
    ]);
  });
});
