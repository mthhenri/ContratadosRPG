import { TestBed } from '@angular/core/testing';
import {
  ArquetipoEnum,
  ClasseEnum,
  EspecialidadeEfeitoEnum,
  FormacaoBonusEnum,
  HabilidadeCategoriaEnum,
  ItemCategoriaEnum,
  SeveridadeLesaoEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaJogadorDadosDto, FichaOrigemDto } from '@contratados-rpg/shared/dtos/ficha';
import { calcularVida } from '@contratados-rpg/shared/regras/agente';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaVisualizacao } from './ficha-visualizacao.component';

/**
 * Prova a exibição read-only da ficha (m3-07): apresenta identidade (codinome, classe/arquétipo,
 * patente derivada), vitalidade e os status derivados **via `shared/regras`** (mesma fonte da
 * edição, sem duplicar fórmula) e **não** expõe nenhum controle de formulário fora do card.
 *
 * Redesenho de comparação visual (branch `claude/redesign-ficha-screen-*`): a tela ficou reduzida
 * a este único card — abas, Atributos, Informações Extras e o card "Identidade" detalhado saíram
 * da tela por ora. Os testes que cobriam exclusivamente essas seções removidas saíram junto; os
 * que exercitam lógica pura do componente (sem depender do DOM removido) foram mantidos.
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

  it('exibe codinome, classe/arquétipo e classificação, e é somente leitura quando não ajustável', () => {
    const { raiz } = montar(dados);
    expect(raiz.querySelector('.ficha-ident__nome')?.textContent?.trim()).toBe('Corvo');
    const chips = Array.from(raiz.querySelectorAll('.chip')).map((c) => c.textContent?.trim());
    expect(chips).toContain('Combatente');
    expect(chips).toContain('Mercenário');
    expect(raiz.querySelector('.chip-classificacao')?.textContent?.trim()).toBe('FICHA-JGD-0042');
    expect(raiz.querySelector('input')).toBeNull();
    expect(raiz.querySelector('select')).toBeNull();
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

  describe('Defesa/Resistências em miniatura (glance, redesenho de comparação visual)', () => {
    it('mostra Defesa/Esquiva/Bloqueio e o placeholder de Contra-ataque, só leitura quando não ajustável', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false);
      // Escopado ao card de Identidade — o card de Status tem outra `.ficha-combate-rapido`
      // (Deslocamento e cia., redesenho de comparação visual), essa sim editável.
      const linhaDefesa = raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const caixas = Array.from(linhaDefesa.querySelectorAll('.ficha-mini__rotulo')).map(
        (r) => r.textContent?.trim(),
      );
      expect(caixas).toEqual(['Defesa', 'Esquiva', 'Bloqueio', 'Contra-ataque']);
      expect(linhaDefesa.querySelector('button')).toBeNull();
      expect(linhaDefesa.querySelector('input')).toBeNull();
    });

    it('Defesa/Esquiva/Bloqueio ficam editáveis quando ajustável e emitem via ajusteDerivado', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const ajustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

      const linhaDefesa = alvo.raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const botao = Array.from(linhaDefesa.querySelectorAll('.ficha-mini__valor--editavel')).find(
        (b) => b.getAttribute('aria-label') === 'Editar Defesa',
      ) as HTMLButtonElement;
      botao.click();
      alvo.fixture.detectChanges();

      const entrada = linhaDefesa.querySelector<HTMLInputElement>('.ficha-mini__entrada')!;
      entrada.value = '15';
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(ajustes).toEqual([{ chave: 'defesa', valor: 15 }]);
    });

    it('Contra-ataque segue placeholder tracejado, não editável, sem a habilidade "Contra-Ataque"', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true);
      const linhaDefesa = raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const contraAtaque = Array.from(linhaDefesa.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === 'Contra-ataque',
      )!;
      expect(contraAtaque.classList.contains('ficha-mini--contra')).toBe(true);
      expect(contraAtaque.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('—');
      expect(contraAtaque.querySelector('button')).toBeNull();
      expect(contraAtaque.querySelector('input')).toBeNull();
    });

    it('Contra-ataque fica editável quando o jogador tem a habilidade "Contra-Ataque"', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        habilidades: [
          {
            nome: 'Contra-Ataque',
            categoria: HabilidadeCategoriaEnum.CLASSE,
            custoEnergia: 2,
            descricao: '(Reação)…',
          },
        ],
      };
      const alvo = montar(documento, 'Corvo', 42, true);
      const ajustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

      const linhaDefesa = alvo.raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const contraAtaque = Array.from(linhaDefesa.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === 'Contra-ataque',
      )!;
      expect(contraAtaque.classList.contains('ficha-mini--contra')).toBe(false);

      const botao = contraAtaque.querySelector<HTMLButtonElement>('.ficha-mini__valor--editavel')!;
      botao.click();
      alvo.fixture.detectChanges();
      const entrada = contraAtaque.querySelector<HTMLInputElement>('.ficha-mini__entrada')!;
      entrada.value = '4';
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(ajustes).toEqual([{ chave: 'contraAtaque', valor: 4 }]);
    });

    it('mostra sempre as cinco linhas de Resistência, mesmo sem nenhum equipamento (tudo em 0)', () => {
      const { raiz } = montar(dados);
      const abrevs = Array.from(raiz.querySelectorAll('.ficha-resistencia__abrev')).map((a) =>
        a.textContent?.trim(),
      );
      expect(abrevs).toEqual(['Físico', 'Balíst.', 'Explos.', 'Químico', 'Geral']);
    });

    it('soma a resistência das Proteções equipadas (mesmo shared/regras da aba Combate)', () => {
      const { raiz } = montar({
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
      const balistico = Array.from(raiz.querySelectorAll('.ficha-resistencia')).find((box) =>
        box.querySelector('.ficha-resistencia__abrev')?.textContent?.trim() === 'Balíst.',
      );
      expect(balistico?.querySelector('.ficha-resistencia__valor')?.textContent?.trim()).toBe('3');
    });

    it('Resistências ficam editáveis quando ajustável e emitem via ajusteResistencia (base manual)', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const ajustes: { tipo: TipoDanoEnum; valor: number }[] = [];
      alvo.fixture.componentInstance.ajusteResistencia.subscribe((a) => ajustes.push(a));

      const fisico = Array.from(alvo.raiz.querySelectorAll('.ficha-resistencia')).find(
        (box) => box.querySelector('.ficha-resistencia__abrev')?.textContent?.trim() === 'Físico',
      )!;
      fisico.querySelector<HTMLButtonElement>('.ficha-resistencia__valor--editavel')!.click();
      alvo.fixture.detectChanges();
      const entrada = fisico.querySelector<HTMLInputElement>('.ficha-resistencia__entrada')!;
      entrada.value = '2';
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(ajustes).toEqual([{ tipo: TipoDanoEnum.FISICO, valor: 2 }]);
    });
  });

  /**
   * Amplificadores realmente aplicando efeito/débuff (ajuste posterior à m3-36):
   * `shared/regras/agente/amplificador` soma o delta **por cima** do valor base/manual só na
   * leitura — a edição continua mexendo na base (mesma separação de `resistencia.ts`), então os
   * totais exibidos podem **negativar** (ex.: Defesa muito empilhada derruba a Resistência).
   */
  describe('Amplificadores — efeitos mecânicos aplicados (bônus e débuffs)', () => {
    /** Localiza o box `.ficha-mini` de um rótulo na linha de Defesa/Esquiva/Bloqueio (Identidade). */
    function boxDefesa(raiz: HTMLElement, rotulo: string): Element | undefined {
      const linha = raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      return Array.from(linha.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === rotulo,
      );
    }

    it('Defesa (amplificador) soma +1 fixo à Defesa exibida, sem mexer no valor editável (base)', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Defesa', empilhamentos: 1 }] },
      };
      // calcularDefesa: 10 + nível(3) = 13 de base; +1 do amplificador → 14 exibido.
      const alvo = montar(documento, 'Corvo', 42, true);
      const defesa = boxDefesa(alvo.raiz, 'Defesa')!;
      expect(defesa.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('14');

      const ajustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));
      defesa.querySelector<HTMLButtonElement>('.ficha-mini__valor--editavel')!.click();
      alvo.fixture.detectChanges();
      // A edição mostra a base (13), não o efetivo (14) — evita commitar o delta de volta.
      const entrada = defesa.querySelector<HTMLInputElement>('.ficha-mini__entrada')!;
      expect(entrada.value).toBe('13');
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      // Sem alterar o valor, blur/enter no mesmo número não emite nada.
      expect(ajustes).toEqual([]);
    });

    it('Resistente penaliza -1 de Defesa por empilhamento além do 1º (débuff cruzado, doc — "Amplificadores")', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Resistente', empilhamentos: 3 }] },
      };
      // Base 13; Resistente com 3 empilhamentos: -1 × (3-1) = -2 → 11.
      const { raiz } = montar(documento, 'Corvo', 42, true);
      expect(boxDefesa(raiz, 'Defesa')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('11');
    });

    it('Reflexos soma +1 fixo à Esquiva; Resiliência soma +1 fixo ao Bloqueio', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: {
          itens: [],
          amplificadores: [
            { nome: 'Reflexos', empilhamentos: 1 },
            { nome: 'Resiliência', empilhamentos: 1 },
          ],
        },
      };
      // calcularDefesa: esquiva = 13 + destreza(2) = 15; bloqueio = 13 + vigor(4) = 17.
      const { raiz } = montar(documento, 'Corvo', 42, false);
      expect(boxDefesa(raiz, 'Esquiva')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('16');
      expect(boxDefesa(raiz, 'Bloqueio')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('18');
    });

    it('a Resistência total pode negativar quando o débuff supera o equipamento (sem piso em 0)', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Defesa', empilhamentos: 3 }] },
      };
      // Sem equipamento/manual: -1 × (3-1) = -2 em todos os cinco tipos.
      const { raiz } = montar(documento);
      const valores = Array.from(raiz.querySelectorAll('.ficha-resistencia__valor')).map((v) =>
        v.textContent?.trim(),
      );
      expect(valores.every((v) => v === '-2')).toBe(true);
    });

    it('Vida/Energia (amplificadores) somam ±1 por Nível na máxima exibida, escalando com empilhamentos', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Vida', empilhamentos: 1 }] },
      };
      const vidaBase = calcularVida({ classe: ClasseEnum.COMBATENTE, nivel: 3, vigor: 4 });
      // Vida concede +1/Nível fixo — Nível 3 → +3.
      const { raiz } = montar(documento);
      const barra = raiz.querySelector('.ficha-barra--vida .ficha-barra__valor')?.textContent ?? '';
      expect(barra.replace(/\s+/g, '')).toBe(`5/${vidaBase + 3}`);
    });

    it('Muscular soma +2 no modificador de teste de Luta/Força e -1 em Intelecto do 2º empilhamento', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Muscular', empilhamentos: 2 }] },
      };
      const { raiz } = montar(documento);
      const caixaLuta = Array.from(raiz.querySelectorAll('.ficha-atributo')).find(
        (box) => box.querySelector('.ficha-atributo__abrev')?.textContent?.trim().startsWith('LUT'),
      )!;
      expect(caixaLuta.querySelector('.ficha-atributo__mod-valor')?.textContent?.trim()).toBe('+2');
      const caixaIntelecto = Array.from(raiz.querySelectorAll('.ficha-atributo')).find(
        (box) => box.querySelector('.ficha-atributo__abrev')?.textContent?.trim().startsWith('INT'),
      )!;
      expect(caixaIntelecto.querySelector('.ficha-atributo__mod-valor')?.textContent?.trim()).toBe('-1');
    });

    it('o modificador de teste do amplificador entra na fórmula rolada (soma ao manual, nunca substitui)', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        modificadoresTeste: { luta: 1 },
        inventario: { itens: [], amplificadores: [{ nome: 'Muscular', empilhamentos: 1 }] },
      };
      const alvo = montar(documento, 'Corvo', 42, true);
      const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => undefined);
      alvo.fixture.componentInstance['rolarTesteAtributo'](campoLuta);
      // manual (+1) + amplificador Muscular (+2) = +3.
      expect(spy.mock.calls[0][0].formula).toBe('lutad20kh1cm1 + PROF + 3');
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

  it('marca Maestria só em atributo com 6+ e emite atributos + maestria ao salvar (lógica, sem UI de Atributos na tela)', () => {
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
    // Nível, Prestígio, Dinheiro, Defesa, Esquiva e Bloqueio editáveis (Patente e Salário seguem
    // derivados, não editáveis; Contra-ataque só entra com a habilidade — fora deste fixture).
    // Escopado ao card de Identidade — o card de Status tem seus próprios editáveis (Deslocamento
    // e cia., redesenho de comparação visual).
    expect(
      raiz.querySelectorAll('.ficha-visao__coluna--identidade .ficha-mini__valor--editavel').length,
    ).toBe(6);
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

  it('clampa o Nível a 0–20 pra Agente (não deixa passar de 20 nem ir abaixo de 0)', () => {
    const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
    const campos: { campo: string; valor: number }[] = [];
    componente.ajusteCampoDados.subscribe((c) => campos.push(c));

    componente['editarIdentidade']('nivel');
    componente['confirmarIdentidade']('nivel', '35');
    componente['editarIdentidade']('nivel');
    componente['confirmarIdentidade']('nivel', '-4');

    expect(campos).toEqual([
      { campo: 'nivel', valor: 20 },
      { campo: 'nivel', valor: 0 },
    ]);
  });

  it('clampa o Nível (Treinamentos) a 0–5 pra Civil', () => {
    const componente = montar({ ...dados, classe: ClasseEnum.CIVIL, arquetipo: null }, 'Corvo', 42, true)
      .fixture.componentInstance;
    const campos: { campo: string; valor: number }[] = [];
    componente.ajusteCampoDados.subscribe((c) => campos.push(c));

    componente['editarIdentidade']('nivel');
    componente['confirmarIdentidade']('nivel', '9');

    expect(campos).toEqual([{ campo: 'nivel', valor: 5 }]);
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

  // === Identidade (m3-25) — só a lógica pura sobrevive nesta rodada: o card "Identidade"
  // detalhado (Personalidade/Origem com Formação/Especialidade) saiu da tela; os métodos do
  // componente continuam corretos e testados diretamente, sem depender do DOM removido.
  describe('Identidade (m3-25) — lógica sem UI dedicada na tela', () => {
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
