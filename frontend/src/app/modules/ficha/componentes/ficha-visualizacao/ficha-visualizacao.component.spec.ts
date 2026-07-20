import { TestBed } from '@angular/core/testing';
import {
  ArquetipoEnum,
  ClasseEnum,
  EspecialidadeEfeitoEnum,
  FormacaoBonusEnum,
  HabilidadeCategoriaEnum,
  ItemCategoriaEnum,
  SeveridadeLesaoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaHabilidadeDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { calcularVida } from '@contratados-rpg/shared/regras/agente';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
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

  function montar(
    documento: FichaJogadorDadosDto,
    nome = 'Corvo',
    fichaId = 42,
    ajustavel = false,
    ehMestre = false,
  ) {
    TestBed.configureTestingModule({ imports: [FichaVisualizacao] });
    const fixture = TestBed.createComponent(FichaVisualizacao);
    fixture.componentRef.setInput('fichaId', fichaId);
    fixture.componentRef.setInput('nome', nome);
    fixture.componentRef.setInput('dados', documento);
    fixture.componentRef.setInput('ajustavel', ajustavel);
    fixture.componentRef.setInput('ehMestre', ehMestre);
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

  it('omite o card de anotações (peek da Visão Geral) quando não há texto', () => {
    const { raiz } = montar({ ...dados, anotacoes: '   ' });
    expect(raiz.querySelector('.ficha-visao__anotacoes')).toBeNull();
  });

  describe('aba Anotações (m3-32)', () => {
    it('mostra o texto em leitura e não expõe o lápis quando não é ajustável', () => {
      const alvo = montar(dados, 'Corvo', 42, false);
      trocarAba(alvo.fixture, 'anotacoes');
      expect(alvo.raiz.querySelector('#painel-anotacoes')?.textContent).toContain(
        'Veterano de contenção.',
      );
      expect(alvo.raiz.querySelector('.ficha-cartao__lapis')).toBeNull();
      expect(alvo.raiz.querySelector('textarea')).toBeNull();
    });

    it('mostra o placeholder quando não há anotações', () => {
      const alvo = montar({ ...dados, anotacoes: '' }, 'Corvo', 42, false);
      trocarAba(alvo.fixture, 'anotacoes');
      expect(alvo.raiz.querySelector('#painel-anotacoes')?.textContent).toContain(
        'Sem anotações.',
      );
    });

    it('abre a textarea ao clicar no lápis (ajustável) e emite ao confirmar', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      trocarAba(alvo.fixture, 'anotacoes');
      const emitidas: string[] = [];
      alvo.fixture.componentInstance.ajusteAnotacoes.subscribe((a) => emitidas.push(a));

      alvo.raiz.querySelector<HTMLButtonElement>('.ficha-cartao__lapis')!.click();
      alvo.fixture.detectChanges();
      const textarea = alvo.raiz.querySelector<HTMLTextAreaElement>('textarea')!;
      expect(textarea).not.toBeNull();
      textarea.value = 'Nova anotação.';
      textarea.dispatchEvent(new Event('blur'));
      alvo.fixture.detectChanges();

      expect(emitidas).toEqual(['Nova anotação.']);
    });

    it('Escape cancela a edição sem emitir', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      trocarAba(alvo.fixture, 'anotacoes');
      const emitidas: string[] = [];
      alvo.fixture.componentInstance.ajusteAnotacoes.subscribe((a) => emitidas.push(a));

      alvo.raiz.querySelector<HTMLButtonElement>('.ficha-cartao__lapis')!.click();
      alvo.fixture.detectChanges();
      const textarea = alvo.raiz.querySelector<HTMLTextAreaElement>('textarea')!;
      textarea.value = 'Descartado.';
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      alvo.fixture.detectChanges();

      expect(alvo.raiz.querySelector('textarea')).toBeNull();
      expect(emitidas).toEqual([]);
    });

    it('não emite quando o texto confirmado é igual ao original', () => {
      const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
      const emitidas: string[] = [];
      componente.ajusteAnotacoes.subscribe((a) => emitidas.push(a));

      componente['editarAnotacoes']();
      componente['confirmarAnotacoes'](dados.anotacoes);

      expect(emitidas).toEqual([]);
    });
  });

  describe('Dinheiro + Salário (m3-34)', () => {
    /** Localiza o box `.ficha-mini` (redesenho de comparação visual) de um rótulo no card de identidade. */
    function boxDoRotulo(raiz: HTMLElement, rotulo: string): Element | undefined {
      return Array.from(raiz.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === rotulo,
      );
    }

    it('exibe o dinheiro atual e o salário derivado do Prestígio', () => {
      const { raiz } = montar({ ...dados, prestigio: 1, dinheiro: 3500 });
      expect(boxDoRotulo(raiz, 'Dinheiro')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe(
        '$3.500',
      );
      // Prestígio 1 → patente "Agente", salário $1.000 (tabela de patente).
      expect(boxDoRotulo(raiz, 'Salário')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe(
        '$1.000',
      );
    });

    it('cai em 0 quando a ficha não tem o campo `dinheiro` (retrocompat)', () => {
      // O fixture `dados` base do describe-pai já não tem `dinheiro` — exatamente o caso legado.
      const { raiz } = montar(dados);
      expect(boxDoRotulo(raiz, 'Dinheiro')?.textContent).not.toContain('undefined');
      expect(boxDoRotulo(raiz, 'Dinheiro')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe(
        '$0',
      );
    });

    it('Salário nunca tem affordance de edição, mesmo ajustável', () => {
      const { raiz } = montar({ ...dados, dinheiro: 1000 }, 'Corvo', 42, true);
      expect(boxDoRotulo(raiz, 'Salário')?.querySelector('button')).toBeNull();
    });

    it('edita o Dinheiro e emite via ajusteCampoDados', () => {
      const alvo = montar({ ...dados, dinheiro: 1000 }, 'Corvo', 42, true);
      const campos: { campo: string; valor: number }[] = [];
      alvo.fixture.componentInstance.ajusteCampoDados.subscribe((c) => campos.push(c));

      const botao = boxDoRotulo(alvo.raiz, 'Dinheiro')!.querySelector<HTMLButtonElement>(
        '.ficha-mini__valor--editavel',
      )!;
      botao.click();
      alvo.fixture.detectChanges();
      const entrada = alvo.raiz.querySelector<HTMLInputElement>('.ficha-mini__entrada')!;
      entrada.value = '4200';
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      alvo.fixture.detectChanges();

      expect(campos).toEqual([{ campo: 'dinheiro', valor: 4200 }]);
    });
  });

  describe('Resistências no Combate (m3-36)', () => {
    /** Ativa a aba Combate clicando no seu `role="tab"`. */
    function trocarParaCombate(fixture: ReturnType<typeof montar>['fixture']): HTMLElement {
      const raiz = fixture.nativeElement as HTMLElement;
      raiz.querySelector<HTMLButtonElement>('#aba-combate')!.click();
      fixture.detectChanges();
      return raiz;
    }

    it('mostra sempre as cinco linhas de resistência, mesmo sem nenhum equipamento (tudo em 0)', () => {
      const { fixture } = montar(dados);
      const raiz = trocarParaCombate(fixture);
      ['Físico', 'Balístico', 'Explosão', 'Químico', 'Geral'].forEach((tipo) => {
        expect(raiz.textContent).toContain(tipo);
      });
    });

    /** Localiza a linha (`.ficha-info__linha`) de um tipo de dano dentro da aba Combate. */
    function linhaDoTipo(raiz: HTMLElement, tipo: string): Element | undefined {
      return Array.from(raiz.querySelectorAll('.ficha-info__linha')).find(
        (linha) => linha.querySelector('.ficha-info__rotulo')?.textContent?.trim() === tipo,
      );
    }

    it('soma a resistência das Proteções equipadas e reage a mudança de equipamento', () => {
      const alvo = montar({
        ...dados,
        inventario: {
          itens: [
            {
              nome: 'Colete Kevlar',
              categoria: ItemCategoriaEnum.PROTECOES,
              custo: 400,
              peso: 2,
              quantidade: 1,
              guardada: false,
              modificacoes: [],
              resistencia: '3 [Balístico]',
              equipado: true,
            },
          ],
          amplificadores: [],
        },
      });
      const raiz = trocarParaCombate(alvo.fixture);
      expect(linhaDoTipo(raiz, 'Balístico')?.querySelector('.ficha-info__valor')?.textContent?.trim()).toBe('3');

      // Desequipa via nova entrada de `dados` (componente controlado) — some da soma.
      alvo.fixture.componentRef.setInput('dados', {
        ...dados,
        inventario: {
          itens: [
            {
              nome: 'Colete Kevlar',
              categoria: ItemCategoriaEnum.PROTECOES,
              custo: 400,
              peso: 2,
              quantidade: 1,
              guardada: false,
              modificacoes: [],
              resistencia: '3 [Balístico]',
              equipado: false,
            },
          ],
          amplificadores: [],
        },
      });
      alvo.fixture.detectChanges();
      expect(
        linhaDoTipo(alvo.raiz, 'Balístico')?.querySelector('.ficha-info__valor')?.textContent?.trim(),
      ).toBe('0');
    });

    it('permite editar a base manual de uma resistência (complementa o equipamento) quando ajustável', () => {
      const alvo = montar(
        {
          ...dados,
          inventario: {
            itens: [
              {
                nome: 'Colete Kevlar',
                categoria: ItemCategoriaEnum.PROTECOES,
                custo: 400,
                peso: 2,
                quantidade: 1,
                guardada: false,
                modificacoes: [],
                resistencia: '3 [Balístico]',
                equipado: true,
              },
            ],
            amplificadores: [],
          },
        },
        'Corvo',
        42,
        true,
      );
      const raiz = trocarParaCombate(alvo.fixture);
      const linhaResistencia = linhaDoTipo(raiz, 'Balístico')!;
      const botao = linhaResistencia.querySelector<HTMLButtonElement>('button');
      expect(botao).not.toBeNull();
      expect(botao!.textContent?.trim()).toBe('3');

      const emitidos: Array<{ tipo: string; valor: number }> = [];
      alvo.fixture.componentInstance.ajusteResistencia.subscribe((ajuste) => emitidos.push(ajuste));

      botao!.click();
      alvo.fixture.detectChanges();
      const entrada = linhaResistencia.querySelector<HTMLInputElement>('input')!;
      entrada.value = '5';
      entrada.dispatchEvent(new Event('blur'));
      alvo.fixture.detectChanges();

      expect(emitidos).toEqual([{ tipo: 'Balístico', valor: 5 }]);
    });

    it('não mostra affordance de edição na linha de resistência quando não ajustável (só leitura)', () => {
      const alvo = montar(dados, 'Corvo', 42, false);
      const raiz = trocarParaCombate(alvo.fixture);
      const linhaResistencia = linhaDoTipo(raiz, 'Balístico');
      expect(linhaResistencia?.querySelector('button')).toBeNull();
    });
  });

  it('não mostra os passos − / + de Vida/Energia quando não é ajustável (só leitura)', () => {
    const { raiz } = montar(dados);
    expect(raiz.querySelector('.ficha-passo')).toBeNull();
  });

  // Condições (m2-16b): Morrendo/Machucado/Inconsciente — sistema-v4.1.0.md "Condições".
  describe('condições', () => {
    it('mostra as três, ativas conforme o estado e inativas quando ausentes do documento', () => {
      const { raiz } = montar({
        ...dados,
        estado: { ...dados.estado, morrendo: true, machucado: false },
        // `inconsciente` fica de fora do documento de propósito — ausente deve virar inativo.
      });
      expect(raiz.querySelectorAll('.ficha-condicoes__item')).toHaveLength(3);
      expect(
        raiz.querySelector('[data-condicao="morrendo"]')?.classList.contains('ficha-condicoes__item--ativa'),
      ).toBe(true);
      expect(
        raiz.querySelector('[data-condicao="machucado"]')?.classList.contains('ficha-condicoes__item--ativa'),
      ).toBe(false);
      expect(
        raiz
          .querySelector('[data-condicao="inconsciente"]')
          ?.classList.contains('ficha-condicoes__item--ativa'),
      ).toBe(false);
    });

    it('não ajustável: os botões ficam desabilitados (clicar não emite nada)', () => {
      const { fixture, raiz } = montar(dados, 'Corvo', 42, false);
      const emitidos: unknown[] = [];
      fixture.componentInstance.ajusteCondicoes.subscribe((c) => emitidos.push(c));

      const botao = raiz.querySelector<HTMLButtonElement>('[data-condicao="morrendo"]')!;
      expect(botao.disabled).toBe(true);
      botao.click();

      expect(emitidos).toHaveLength(0);
    });

    it('ajustável: clicar liga a condição e emite o conjunto atualizado', () => {
      const { fixture, raiz } = montar(dados, 'Corvo', 42, true);
      const emitidos: unknown[] = [];
      fixture.componentInstance.ajusteCondicoes.subscribe((c) => emitidos.push(c));

      raiz.querySelector<HTMLButtonElement>('[data-condicao="morrendo"]')!.click();

      expect(emitidos).toEqual([{ morrendo: true, machucado: false, inconsciente: false }]);
    });

    it('clicar de novo desliga a condição (toggle)', () => {
      const { fixture, raiz } = montar(
        { ...dados, estado: { ...dados.estado, morrendo: true } },
        'Corvo',
        42,
        true,
      );
      const emitidos: unknown[] = [];
      fixture.componentInstance.ajusteCondicoes.subscribe((c) => emitidos.push(c));

      raiz.querySelector<HTMLButtonElement>('[data-condicao="morrendo"]')!.click();

      expect(emitidos).toEqual([{ morrendo: false, machucado: false, inconsciente: false }]);
    });
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

  it('mostra os alvos de edição de identidade (Codinome/Nível/Prestígio/Dinheiro) quando ajustável', () => {
    const { raiz } = montar(dados, 'Corvo', 42, true);
    expect(raiz.querySelector('.ficha-ident__nome--editavel')).not.toBeNull();
    // Nível, Prestígio e Dinheiro editáveis (Patente e Salário seguem derivados, não editáveis).
    expect(raiz.querySelectorAll('.ficha-mini__valor--editavel').length).toBe(3);
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

  it('renderiza as seis abas com a Visão Geral ativa por padrão (Rolagens mesclada em Combate — m3-37)', () => {
    const { raiz } = montar(dados);
    const abas = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(abas.map((a) => a.textContent?.trim())).toEqual([
      'Visão Geral',
      'Combate',
      'Inventário',
      'Habilidades',
      'Sanidade & Lesões',
      'Anotações',
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

    // Inventário mostra o máximo (derivado realocado) e embute o editor de inventário (m3-14).
    trocarAba(alvo.fixture, 'inventario');
    const inventario = Array.from(
      alvo.raiz.querySelectorAll('#painel-inventario .ficha-info__rotulo'),
    ).map((r) => r.textContent?.trim());
    expect(inventario).toEqual(['Máximo']);
    expect(alvo.raiz.querySelector('#painel-inventario app-ficha-inventario')).not.toBeNull();
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

  it('embute o editor de Rolagens (m3-15) com os presets da ficha, mesclado na aba Combate (m3-37)', () => {
    const documento: FichaJogadorDadosDto = {
      ...dados,
      rolagens: [{ nome: 'Ataque', formula: '1d20+PON' }],
    };
    const alvo = montar(documento);

    trocarAba(alvo.fixture, 'combate');
    expect(alvo.raiz.textContent).toContain('1 preset');
    expect(alvo.raiz.querySelector('app-ficha-rolagens')).not.toBeNull();
    // O preset aparece no editor (nome + fórmula), não num placeholder "em construção".
    expect(alvo.raiz.textContent).toContain('1d20+PON');
    expect(alvo.raiz.textContent).not.toContain('em construção');
  });

  it('embute o editor de Combos (m3-37) na mesma aba Combate', () => {
    const documento: FichaJogadorDadosDto = {
      ...dados,
      rolagens: [{ nome: 'Ataque', formula: '1d20+PON' }],
      combos: [{ nome: 'Abertura', passos: [{ nome: 'Golpe', rolagemNome: 'Ataque' }] }],
    };
    const alvo = montar(documento);

    trocarAba(alvo.fixture, 'combate');
    expect(alvo.raiz.querySelector('app-ficha-combos')).not.toBeNull();
    expect(alvo.raiz.textContent).toContain('Abertura');
  });

  const campoLuta = { chave: 'luta' as const, abrev: 'LUT', nome: 'Luta' };

  it('rola teste de atributo normal com kh1 + cm1 (margem de crítico natural; m3-31)', () => {
    const alvo = montar(dados, 'Corvo', 42, true); // Luta 2, sem lesão → normal
    const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => undefined);
    alvo.fixture.componentInstance['rolarTesteAtributo'](campoLuta);
    expect(spy.mock.calls[0][0].formula).toBe('lutad20kh1cm1 + PROF');
  });

  it('em desvantagem (atributo ≤ 0) a legenda é honesta: kl1 com a contagem real, não kh1 (m3-31)', () => {
    const doc = {
      ...dados,
      estado: {
        ...dados.estado,
        lesoes: [{ atributo: 'luta' as const, pontos: 2, severidade: SeveridadeLesaoEnum.GRAVE, permanente: true }],
      },
    };
    const alvo = montar(doc, 'Corvo', 42, true); // Luta efetivo 0 → desvantagem (2d20 mantém o menor)
    const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => undefined);
    alvo.fixture.componentInstance['rolarTesteAtributo'](campoLuta);
    expect(spy.mock.calls[0][0].formula).toBe('2d20kl1cm1 + PROF');
    expect(spy.mock.calls[0][0].resultado.dados[0].desvantagem).toBe(true);
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

  describe('Identidade (m3-25)', () => {
    const origemExemplo: FichaOrigemDto = {
      nome: 'Ex-Militar',
      descricao: 'Serviu nas forças armadas antes de ser recrutado.',
      saberDeCampo: 'Táticas de combate urbano',
      formacao: [
        { bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO, parametro: null, texto: '+1m de Deslocamento' },
        {
          bonus: FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA,
          parametro: 'Armas de Fogo',
          texto: '+1 dado com Armas de Fogo',
        },
      ],
      especialidade: { gatilho: 'Sob fogo direto', efeito: EspecialidadeEfeitoEnum.DADO_EXTRA },
    };

    it('ficha sem o bloco identidade (retrocompat) mostra tudo como não definido', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true);
      expect(raiz.querySelector('.ficha-identidade__personalidade')?.textContent).toContain('— Definir —');
      expect(raiz.querySelector('.ficha-visao__vazio')?.textContent).toContain('Origem ainda não definida');
    });

    it('dono define a Personalidade e a Origem pela primeira vez — emite os ajustes', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false);
      const personalidades: string[] = [];
      const origens: FichaOrigemDto[] = [];
      alvo.fixture.componentInstance.ajustePersonalidade.subscribe((p) => personalidades.push(p));
      alvo.fixture.componentInstance.ajusteOrigem.subscribe((o) => origens.push(o));

      const componente = alvo.fixture.componentInstance;
      componente['editarIdentidade']('personalidade');
      componente['confirmarIdentidade']('personalidade', 'Valente');
      componente['editarOrigem']();
      componente['rascunhoOrigem'].set(origemExemplo);
      componente['confirmarOrigem']();

      expect(personalidades).toEqual(['Valente']);
      expect(origens).toEqual([origemExemplo]);
    });

    it('dono com Personalidade/Origem já definidas vê somente leitura, sem lápis', () => {
      const documento = { ...dados, identidade: { personalidade: 'Valente', origem: origemExemplo } };
      const { raiz } = montar(documento, 'Corvo', 42, true, false);

      expect(raiz.querySelector('.ficha-identidade__personalidade .ficha-ident__nome--editavel')).toBeNull();
      expect(raiz.querySelector('.ficha-identidade__personalidade')?.textContent).toContain('Valente');
      expect(raiz.querySelector('.ficha-identidade__personalidade')?.textContent).toContain('imutável');
      expect(raiz.querySelector('.ficha-identidade__origem-cabecalho .ficha-ident__chip-lapis')).toBeNull();
      expect(raiz.querySelector('.ficha-identidade__origem-cabecalho')?.textContent).toContain('imutável');
      expect(raiz.querySelector('.ficha-identidade__origem-nome')?.textContent).toContain('Ex-Militar');
    });

    it('mestre com Personalidade/Origem já definidas continua vendo os lápis', () => {
      const documento = { ...dados, identidade: { personalidade: 'Valente', origem: origemExemplo } };
      const { raiz } = montar(documento, 'Corvo', 42, true, true);

      expect(raiz.querySelector('.ficha-identidade__personalidade .ficha-ident__nome--editavel')).not.toBeNull();
      expect(raiz.querySelector('.ficha-identidade__origem-cabecalho .ficha-ident__chip-lapis')).not.toBeNull();
    });

    it('escolher um bônus de Formação preenche o texto com o rótulo do catálogo e zera o parâmetro', () => {
      const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
      componente['editarOrigem']();

      componente['mudarBonusFormacaoRascunho'](0, FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO);

      const linha = componente['rascunhoOrigem']()!.formacao[0];
      expect(linha.bonus).toBe(FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO);
      expect(linha.texto).toBe('+1m de Deslocamento');
      expect(linha.parametro).toBeNull();
    });

    it('"Outro (autorizado pelo Mestre)" grava bonus: null com texto preenchido pelo autor', () => {
      const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
      componente['editarOrigem']();

      componente['mudarBonusFormacaoRascunho'](0, '');
      componente['mudarTextoFormacaoRascunho'](0, '+1 dado em testes de Escalada');

      const linha = componente['rascunhoOrigem']()!.formacao[0];
      expect(linha.bonus).toBeNull();
      expect(linha.texto).toBe('+1 dado em testes de Escalada');
    });

    it('Esquiva ou Bloqueio renderiza um <select> com as duas opções (o motor casa a string exata)', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      alvo.fixture.componentInstance['editarOrigem']();
      alvo.fixture.componentInstance['mudarBonusFormacaoRascunho'](
        0,
        FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO,
      );
      alvo.fixture.detectChanges();

      const selects = Array.from(alvo.raiz.querySelectorAll('.ficha-identidade__formacao-editor select'));
      const opcoes = selects
        .find((select) => Array.from(select.querySelectorAll('option')).some((o) => o.value === 'Esquiva'))
        ?.querySelectorAll('option');
      expect(Array.from(opcoes ?? []).map((o) => o.value)).toEqual(['', 'Esquiva', 'Bloqueio']);
    });

    it('marca "sem efeito automático" para um bônus ainda pendente, e não marca um já aplicado', () => {
      const documento = {
        ...dados,
        identidade: {
          personalidade: null,
          origem: {
            ...origemExemplo,
            // MOVIMENTO_DESLOCAMENTO já é aplicado (DERIVADO); PERICIA_DADO_INICIATIVA ainda não (INICIATIVA).
            formacao: [
              { bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO, parametro: null, texto: 'Aplicado' },
              { bonus: FormacaoBonusEnum.PERICIA_DADO_INICIATIVA, parametro: null, texto: 'Pendente' },
            ],
          },
        },
      };
      const { raiz } = montar(documento, 'Corvo', 42, true);

      const linhas = Array.from(raiz.querySelectorAll('.ficha-identidade__formacao-linha'));
      const aplicada = linhas.find((linha) => linha.textContent?.includes('Aplicado'))!;
      const pendente = linhas.find((linha) => linha.textContent?.includes('Pendente'))!;
      expect(aplicada.querySelector('.chip--pendente')).toBeNull();
      expect(pendente.querySelector('.chip--pendente')).not.toBeNull();
    });

    it('cancelar a edição de Origem descarta o rascunho sem emitir nada', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const origens: FichaOrigemDto[] = [];
      alvo.fixture.componentInstance.ajusteOrigem.subscribe((o) => origens.push(o));

      alvo.fixture.componentInstance['editarOrigem']();
      alvo.fixture.componentInstance['mudarTextoOrigemRascunho']('nome', 'Rascunho descartado');
      alvo.fixture.componentInstance['cancelarOrigem']();

      expect(origens).toEqual([]);
      expect(alvo.fixture.componentInstance['editandoOrigem']()).toBe(false);
      expect(alvo.fixture.componentInstance['rascunhoOrigem']()).toBeNull();
    });
  });
});
