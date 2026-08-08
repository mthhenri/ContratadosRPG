import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ArquetipoEnum,
  ClasseEnum,
  FormacaoBonusEnum,
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  HabilidadeCategoriaEnum,
  ItemCategoriaEnum,
  SeveridadeLesaoEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type {
  FichaFragmentoConsumidoDto,
  FichaHabilidadeDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { calcularVida } from '@contratados-rpg/shared/regras/agente';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaVisualizacao } from './ficha-visualizacao.component';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';

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
    // m3-51: por padrão espelha `ajustavel` (é assim que a página liga hoje — dono/mestre rolam,
    // visualizador não) — testes que precisam dissociar os dois passam o valor explicitamente.
    podeRolar = ajustavel,
  ) {
    // `FichaRolagemRegistroService` (m2-21) é provido pela **página** que hospeda a ficha
    // (`VisualizarPage`/`CampanhaDetalhe`, `providers: []`), nunca em `root`: a flag "Rolagem
    // oculta" e o caminho de registro são compartilhados entre o card e o painel de Rolagens da
    // lateral, mas presos a uma ficha só. Aqui o TestBed faz o papel da página.
    TestBed.configureTestingModule({
      imports: [FichaVisualizacao],
      providers: [FichaRolagemRegistroService],
    });
    const fixture = TestBed.createComponent(FichaVisualizacao);
    fixture.componentRef.setInput('fichaId', fichaId);
    fixture.componentRef.setInput('nome', nome);
    fixture.componentRef.setInput('dados', documento);
    fixture.componentRef.setInput('ajustavel', ajustavel);
    fixture.componentRef.setInput('ehMestre', ehMestre);
    fixture.componentRef.setInput('podeRolar', podeRolar);
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

  it('mostra a progressão da classe no hover (appTooltip) dos rótulos de Vida e Energia', () => {
    const { fixture } = montar(dados);
    const dicaVida = fixture.debugElement
      .query(By.css('.ficha-barra--vida .ficha-barra__rotulo--dica'))
      .injector.get(Tooltip).appTooltip();
    expect(dicaVida).toContain('Combatente');
    expect(dicaVida).toContain('/nível');
    const dicaEnergia = fixture.debugElement
      .query(By.css('.ficha-barra--energia .ficha-barra__rotulo--dica'))
      .injector.get(Tooltip).appTooltip();
    expect(dicaEnergia).toContain('Energia');
  });

  it('hover/foco no atributo revela a DT dele — shared/regras/dt, mesma fórmula da página de DT (m3-55)', () => {
    const { fixture } = montar(dados);
    const abrevs = fixture.debugElement.queryAll(By.css('.ficha-atributo__abrev--dica'));
    const forca = abrevs.find((de) => (de.nativeElement as HTMLElement).textContent?.trim().startsWith('FOR'))!;
    // Nível 3, Força 3 (sem lesão) → DT = 10 + 3 + 3×2 = 19.
    expect(forca.nativeElement.getAttribute('tabindex')).toBe('0');
    expect(forca.nativeElement.getAttribute('aria-label')).toBe('Força — DT 19');
    expect(forca.injector.get(Tooltip).appTooltip()).toBe('Força — DT 19');
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

    it('modo compacto: mostra o Limite de Crédito ao lado de Dinheiro/Salário, com ízinho de descrição', () => {
      // No `modo="compacto"` (card de equipe) não há aba Extras pra mostrar a seção Patente
      // inteira — o Limite de Crédito precisa caber aqui, com a descrição no balão do ízinho.
      const alvo = montar({ ...dados, prestigio: 12 });
      alvo.fixture.componentRef.setInput('modo', 'compacto');
      alvo.fixture.detectChanges();

      const boxCredito = boxDoRotulo(alvo.raiz, 'Crédito');
      expect(boxCredito?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('Alto');
      const botaoInfo = boxCredito?.querySelector<HTMLButtonElement>('.ficha-mini__info');
      expect(botaoInfo?.getAttribute('aria-label')).toBe('Descrição do Limite de Crédito');
      const dica = botaoInfo && alvo.fixture.debugElement
        .query(By.css('.ficha-mini__info'))
        .injector.get(Tooltip).appTooltip();
      expect(dica).toContain('Status de "cliente vip".');
    });

    it('modo padrão: não mostra o Limite de Crédito na linha de Identidade (só no compacto)', () => {
      const { raiz } = montar({ ...dados, prestigio: 12 });
      expect(boxDoRotulo(raiz, 'Crédito')).toBeUndefined();
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

    it('Contra-ataque mostra a Defesa Final calculada (Defesa + Luta ÷ 2) sem precisar de edição manual', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        habilidades: [
          {
            nome: 'Contra-Ataque',
            categoria: HabilidadeCategoriaEnum.GERAL,
            custoEnergia: 2,
            descricao: '(Reação)…',
          },
        ],
      };
      const { raiz } = montar(documento, 'Corvo', 42, true);
      const linhaDefesa = raiz.querySelector('.ficha-visao__coluna--identidade .ficha-combate-rapido')!;
      const contraAtaque = Array.from(linhaDefesa.querySelectorAll('.ficha-mini')).find(
        (box) => box.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === 'Contra-ataque',
      )!;
      const botao = contraAtaque.querySelector<HTMLButtonElement>('.ficha-mini__valor--editavel')!;
      // dados.nivel = 3, classe COMBATENTE → Defesa Base = 10 + 3 = 13.
      // dados.atributos.luta = 2 (ver fixture no topo do arquivo) → floor(2 / 2) = 1. Total = 14.
      expect(botao.textContent?.trim()).toBe('14');
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

    it('soma a resistência embutida de um armazenamento vestido, ex. Mochila Kevlar (m3-43)', () => {
      const { raiz } = montar({
        ...dados,
        inventario: {
          itens: [
            {
              nome: 'Mochila Kevlar',
              categoria: ItemCategoriaEnum.ARMAZENAMENTO,
              custo: 1200,
              peso: 0.7,
              quantidade: 1,
              guardada: false,
              modificacoes: [],
            },
          ],
          amplificadores: [],
        },
      });
      const fisico = Array.from(raiz.querySelectorAll('.ficha-resistencia')).find((box) =>
        box.querySelector('.ficha-resistencia__abrev')?.textContent?.trim() === 'Físico',
      );
      expect(fisico?.querySelector('.ficha-resistencia__valor')?.textContent?.trim()).toBe('2');
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

    it('Reflexos soma +1/empilhamento à Esquiva; Resiliência soma +1/empilhamento ao Bloqueio', () => {
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

    it('Flexível (mod de Proteções equipada) soma Esquiva; Resistente soma Bloqueio (m3-43)', () => {
      const documento: FichaJogadorDadosDto = {
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
              modificacoes: [
                { nome: 'Flexível', empilhamentos: 1 },
                { nome: 'Resistente', empilhamentos: 1 },
              ],
              resistencia: '3 [Balístico]',
              equipado: true,
            },
          ],
          amplificadores: [],
        },
      };
      // esquiva base 15 (13 + destreza 2) + 1 Flexível = 16; bloqueio base 17 (13 + vigor 4) + 1 Resistente = 18.
      const { raiz } = montar(documento);
      expect(boxDefesa(raiz, 'Esquiva')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('16');
      expect(boxDefesa(raiz, 'Bloqueio')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('18');
    });

    it('ignora mods de armadura fora do equipado — item na mochila não conta (m3-43)', () => {
      const documento: FichaJogadorDadosDto = {
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
              modificacoes: [{ nome: 'Flexível', empilhamentos: 1 }],
              resistencia: '3 [Balístico]',
              equipado: false,
            },
          ],
          amplificadores: [],
        },
      };
      const { raiz } = montar(documento);
      expect(boxDefesa(raiz, 'Esquiva')?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('15');
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

    it('Muscular soma +2/empilhamento no modificador de teste de Luta/Força e -1 em Intelecto do 2º empilhamento', () => {
      const documento: FichaJogadorDadosDto = {
        ...dados,
        inventario: { itens: [], amplificadores: [{ nome: 'Muscular', empilhamentos: 2 }] },
      };
      const { raiz } = montar(documento);
      const caixaLuta = Array.from(raiz.querySelectorAll('.ficha-atributo')).find(
        (box) => box.querySelector('.ficha-atributo__abrev')?.textContent?.trim().startsWith('LUT'),
      )!;
      // Bônus escala com os empilhamentos (2 × +2 = +4) — só a penalidade cruzada (Intelecto) fica presa a "empilhamentos - 1".
      expect(caixaLuta.querySelector('.ficha-atributo__mod-valor')?.textContent?.trim()).toBe('+4');
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
      const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => 1);
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

  it('ajusta dados de teste de um atributo no rascunho e emite junto com o resto do grupo ao salvar', () => {
    const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
    const ajustes: { dadosTeste: Record<string, number> }[] = [];
    componente.ajusteAtributos.subscribe((a) => ajustes.push(a));

    componente['editarAtributos']();
    // Antes de qualquer ajuste, o rascunho completo nasce zerado (as 10 chaves).
    expect(componente['rascunhoDadosTeste']()!.destreza).toBe(0);

    componente['ajustarDadosTesteRascunho']('destreza', 1);
    componente['ajustarDadosTesteRascunho']('destreza', 1);
    componente['ajustarDadosTesteRascunho']('forca', -1);
    componente['confirmarAtributos']();

    expect(ajustes).toHaveLength(1);
    expect(ajustes[0].dadosTeste['destreza']).toBe(2);
    expect(ajustes[0].dadosTeste['forca']).toBe(-1);
    expect(ajustes[0].dadosTeste['luta']).toBe(0);
  });

  it('lê o ajuste de dados de teste persistido fora da edição (dadosTesteDe)', () => {
    const documento = { ...dados, dadosTeste: { destreza: -1 } };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;

    expect(componente['dadosTesteDe']('destreza')).toBe(-1);
    expect(componente['dadosTesteDe']('forca')).toBe(0);
  });

  it('o teste de atributo rola com o ajuste manual de dados somado ao efetivo (sem mexer no atributo exibido)', () => {
    // Destreza base 2, sem lesão, ajuste manual +1 → pool de 3 dados no teste, mas o valor
    // exibido na ficha (atributosEfetivos) continua 2.
    const documento = { ...dados, dadosTeste: { destreza: 1 } };
    const componente = montar(documento, 'Corvo', 42, true).fixture.componentInstance;

    expect(componente['atributosEfetivos']().destreza).toBe(2);
    expect(componente['atributosParaDados']().destreza).toBe(3);
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
    const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => 1);
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
    const spy = vi.spyOn(TestBed.inject(BandejaDadosService), 'mostrar').mockImplementation(() => 1);
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
      especialidade: { gatilho: 'Sob fogo direto', efeito: '+1 dado em um teste' },
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

    it.each(['nome', 'descricao', 'saberDeCampo'] as const)(
      'origemRascunhoValida é false quando falta %s',
      (campo) => {
        const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
        componente['editarOrigem']();
        componente['rascunhoOrigem'].set({ ...origemExemplo, [campo]: '' });

        expect(componente['origemRascunhoValida']()).toBe(false);
      },
    );

    it('origemRascunhoValida é false quando falta o gatilho ou o efeito da Especialidade', () => {
      const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
      componente['editarOrigem']();

      componente['rascunhoOrigem'].set({
        ...origemExemplo,
        especialidade: { gatilho: '', efeito: origemExemplo.especialidade.efeito },
      });
      expect(componente['origemRascunhoValida']()).toBe(false);

      componente['rascunhoOrigem'].set({
        ...origemExemplo,
        especialidade: { gatilho: origemExemplo.especialidade.gatilho, efeito: '' },
      });
      expect(componente['origemRascunhoValida']()).toBe(false);
    });

    it('origemRascunhoValida é true com todos os campos preenchidos', () => {
      const componente = montar(dados, 'Corvo', 42, true).fixture.componentInstance;
      componente['editarOrigem']();
      componente['rascunhoOrigem'].set(origemExemplo);

      expect(componente['origemRascunhoValida']()).toBe(true);
    });

    it('confirmarOrigem não emite nada quando o rascunho está incompleto', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const origens: FichaOrigemDto[] = [];
      alvo.fixture.componentInstance.ajusteOrigem.subscribe((o) => origens.push(o));

      const componente = alvo.fixture.componentInstance;
      componente['editarOrigem']();
      componente['rascunhoOrigem'].set({ ...origemExemplo, nome: '' });
      componente['confirmarOrigem']();

      expect(origens).toEqual([]);
      // O editor continua aberto — não fecha num rascunho inválido.
      expect(componente['editandoOrigem']()).toBe(true);
    });

    describe('m3-XX — oferta de limpar Origem ao adicionar Peculiaridade (mestre-only)', () => {
      const dadosExperimentoComOrigem: FichaJogadorDadosDto = {
        ...dados,
        classe: ClasseEnum.EXPERIMENTO_BESTIAL,
        arquetipo: null,
        habilidades: [],
        identidade: { personalidade: 'Instável', origem: origemExemplo },
      };
      const peculiaridade: FichaHabilidadeDto = {
        nome: 'Peculiaridade',
        categoria: HabilidadeCategoriaEnum.SUBCLASSE,
        custoEnergia: 0,
        descricao: '...',
      };

      it('mestre adiciona Peculiaridade com Origem definida: fica pendente de confirmação, não emite nada ainda', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        const origensLimpas: void[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        alvo.fixture.componentInstance.origemLimpa.subscribe(() => origensLimpas.push(undefined));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([]);
        expect(origensLimpas).toEqual([]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toEqual([peculiaridade]);
      });

      it('confirmar a oferta emite as duas mudanças — habilidades e origemLimpa — no mesmo gesto', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        let origemLimpaChamadas = 0;
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        alvo.fixture.componentInstance.origemLimpa.subscribe(() => origemLimpaChamadas++);

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);
        alvo.fixture.componentInstance['confirmarLimparOrigemEHabilidade']();

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
        expect(origemLimpaChamadas).toBe(1);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('cancelar a oferta descarta a mudança de habilidade — nada é emitido', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);
        alvo.fixture.componentInstance['cancelarLimparOrigem']();

        expect(habilidadesEmitidas).toEqual([]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('dono (não-mestre) adiciona Peculiaridade com Origem definida: passa direto, sem oferta', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, false);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
        expect(alvo.fixture.componentInstance['habilidadesPendentesPeculiaridade']()).toBeNull();
      });

      it('mestre adiciona Peculiaridade sem Origem definida: passa direto, nada para limpar', () => {
        const semOrigem: FichaJogadorDadosDto = { ...dadosExperimentoComOrigem, identidade: { personalidade: 'Instável', origem: null } };
        const alvo = montar(semOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));

        alvo.fixture.componentInstance['mudarHabilidades']([peculiaridade]);

        expect(habilidadesEmitidas).toEqual([[peculiaridade]]);
      });

      it('mudança de habilidade que não introduz Peculiaridade passa direto, mesmo com Origem definida', () => {
        const alvo = montar(dadosExperimentoComOrigem, 'Espécime', 42, true, true);
        const habilidadesEmitidas: unknown[] = [];
        alvo.fixture.componentInstance.ajusteHabilidades.subscribe((h) => habilidadesEmitidas.push(h));
        const outraHabilidade: FichaHabilidadeDto = { nome: 'Foco', categoria: HabilidadeCategoriaEnum.GERAL, custoEnergia: 1, descricao: '...' };

        alvo.fixture.componentInstance['mudarHabilidades']([outraHabilidade]);

        expect(habilidadesEmitidas).toEqual([[outraHabilidade]]);
      });
    });
  });

  describe('Contrato (m3-40)', () => {
    it('exibe o placeholder "CONTRATO — 0000" quando ainda não definido', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false);
      expect(raiz.querySelector('.ficha-ident__contrato')?.textContent?.trim()).toBe('CONTRATO — 0000');
    });

    it('exibe o número do Contrato persistido', () => {
      const documento = { ...dados, contrato: '0731' };
      const { raiz } = montar(documento, 'Corvo', 42, false);
      expect(raiz.querySelector('.ficha-ident__contrato')?.textContent?.trim()).toBe('CONTRATO — 0731');
    });

    it('dono vê o Contrato só leitura, sem lápis', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      expect(raiz.querySelector('.ficha-ident__contrato--editavel')).toBeNull();
    });

    it('mestre vê o Contrato editável e emite o ajuste ao confirmar', () => {
      const alvo = montar(dados, 'Corvo', 42, true, true);
      const contratos: string[] = [];
      alvo.fixture.componentInstance.ajusteContrato.subscribe((c) => contratos.push(c));

      expect(alvo.raiz.querySelector('.ficha-ident__contrato--editavel')).not.toBeNull();
      const componente = alvo.fixture.componentInstance;
      componente['editarIdentidade']('contrato');
      componente['confirmarIdentidade']('contrato', '1234');

      expect(contratos).toEqual(['1234']);
    });
  });

  describe('Preço de Sanidade do Consumo de Fragmento (m3-42)', () => {
    it('acrescenta as sequelas recebidas às já existentes, preservando traumas e lesões', () => {
      const alvo = montar(dados);
      const emitidos: { sequelas: readonly unknown[]; traumas: readonly unknown[]; lesoes: readonly unknown[] }[] = [];
      alvo.fixture.componentInstance.ajusteSanidade.subscribe((e) => emitidos.push(e));

      alvo.fixture.componentInstance['aoConsumirFragmentoSanidade']([
        { nome: 'Rejeição Biológica' },
        { nome: 'Rejeição Biológica' },
      ]);

      expect(emitidos).toEqual([
        {
          sequelas: [
            { nome: 'Insônia', descricao: '−1m de deslocamento' },
            { nome: 'Rejeição Biológica' },
            { nome: 'Rejeição Biológica' },
          ],
          traumas: dados.estado.traumas,
          lesoes: dados.estado.lesoes,
        },
      ]);
    });

    it('lista vazia (evitou a sequela): não emite nada', () => {
      const alvo = montar(dados);
      const emitidos: unknown[] = [];
      alvo.fixture.componentInstance.ajusteSanidade.subscribe((e) => emitidos.push(e));

      alvo.fixture.componentInstance['aoConsumirFragmentoSanidade']([]);

      expect(emitidos).toEqual([]);
    });
  });

  describe('bônus "Consumido" de Fragmento Potencializador (m3-64)', () => {
    it('tipo TESTE: emite ajusteAtributos com o modificador somado ao atributo escolhido, atributos intactos', () => {
      const documento = { ...dados, modificadoresTeste: { vontade: 1 } };
      const alvo = montar(documento, 'Corvo', 42, true);
      const ajustes: { atributos: { vontade: number }; modificadoresTeste: Record<string, number> }[] = [];
      alvo.fixture.componentInstance.ajusteAtributos.subscribe((a) => ajustes.push(a));

      alvo.fixture.componentInstance['aoConsumirFragmentoBonus']({
        opcao: { rotulo: '+3 em todos os testes do atributo à escolha', tipo: 'TESTE', valor: 3 },
        atributoEscolhido: 'vontade',
      });

      expect(ajustes).toHaveLength(1);
      expect(ajustes[0].modificadoresTeste['vontade']).toBe(4);
      expect(ajustes[0].atributos.vontade).toBe(documento.atributos.vontade);
    });

    it('módulo I (concedePontoAtributo): soma também +1 no atributo base escolhido', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const ajustes: { atributos: { intelecto: number } }[] = [];
      alvo.fixture.componentInstance.ajusteAtributos.subscribe((a) => ajustes.push(a));

      alvo.fixture.componentInstance['aoConsumirFragmentoBonus']({
        opcao: {
          rotulo: '+5 em todos os testes do atributo à escolha e +1 ponto no atributo',
          tipo: 'TESTE',
          valor: 5,
          concedePontoAtributo: true,
        },
        atributoEscolhido: 'intelecto',
      });

      expect(ajustes[0].atributos.intelecto).toBe(dados.atributos.intelecto + 1);
    });

    it('tipo DEFESA: emite ajusteDerivado somando ao defesa persistido', () => {
      const documento = { ...dados, derivados: { defesa: 13 } };
      const alvo = montar(documento, 'Corvo', 42, true);
      const ajustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

      alvo.fixture.componentInstance['aoConsumirFragmentoBonus']({
        opcao: { rotulo: '+3 em Defesa', tipo: 'DEFESA', valor: 3 },
        atributoEscolhido: null,
      });

      expect(ajustes).toEqual([{ chave: 'defesa', valor: 16 }]);
    });

    it('tipo DEFESA sem derivados.defesa persistido (classe sem Defesa): não emite nada', () => {
      const alvo = montar(dados, 'Corvo', 42, true);
      const ajustes: unknown[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

      alvo.fixture.componentInstance['aoConsumirFragmentoBonus']({
        opcao: { rotulo: '+3 em Defesa', tipo: 'DEFESA', valor: 3 },
        atributoEscolhido: null,
      });

      expect(ajustes).toEqual([]);
    });

    it('tipo DANO_CORPO: emite ajusteDerivado com o fixo somado via somarDanoFixo', () => {
      const documento = { ...dados, derivados: { danoCorpoACorpo: '1D3 [Físico]' } };
      const alvo = montar(documento, 'Corvo', 42, true);
      const ajustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => ajustes.push(a));

      alvo.fixture.componentInstance['aoConsumirFragmentoBonus']({
        opcao: { rotulo: '+6 de dano do Corpo', tipo: 'DANO_CORPO', valor: 6 },
        atributoEscolhido: null,
      });

      expect(ajustes).toEqual([{ chave: 'danoCorpoACorpo', valor: '1D3+6 [Físico]' }]);
    });
  });

  describe('remover um fragmento consumido (m3-64, correção) — desfaz bônus, Energia Máxima e devolve o item', () => {
    function itemFragmento(modulo: FragmentoModuloEnum): CarrinhoItemDto {
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

    it('tipo TESTE: reverte o modificador de teste (e o +1 de atributo do Módulo I), restitui a Energia Máxima e devolve o item', () => {
      const registro: FichaFragmentoConsumidoDto = {
        modulo: FragmentoModuloEnum.I,
        bonusEscolhido: '+5 em todos os testes de Intelecto e +1 ponto no atributo',
        opcao: {
          rotulo: '+5 em todos os testes do atributo à escolha e +1 ponto no atributo',
          tipo: 'TESTE',
          valor: 5,
          concedePontoAtributo: true,
        },
        atributoEscolhido: 'intelecto',
        deltaEnergiaMaxima: -40,
        item: itemFragmento(FragmentoModuloEnum.I),
      };
      const documento: FichaJogadorDadosDto = {
        ...dados,
        modificadoresTeste: { intelecto: 5 },
        atributos: { ...dados.atributos, intelecto: dados.atributos.intelecto + 1 },
        estado: { ...dados.estado, energiaMaxima: 10 },
        fragmentosConsumidos: [registro],
      };
      const alvo = montar(documento, 'Corvo', 42, true);

      const atributosAjustes: { atributos: { intelecto: number }; modificadoresTeste: Record<string, number> }[] = [];
      alvo.fixture.componentInstance.ajusteAtributos.subscribe((a) => atributosAjustes.push(a));
      const vitalidadeAjustes: { campo: string; valor: number }[] = [];
      alvo.fixture.componentInstance.ajusteVitalidade.subscribe((a) => vitalidadeAjustes.push(a));
      const inventarioAjustes: { itens: readonly CarrinhoItemDto[] }[] = [];
      alvo.fixture.componentInstance.ajusteInventario.subscribe((a) => inventarioAjustes.push(a));
      const fragmentosAjustes: (readonly FichaFragmentoConsumidoDto[])[] = [];
      alvo.fixture.componentInstance.ajusteFragmentosConsumidos.subscribe((a) => fragmentosAjustes.push(a));

      alvo.fixture.componentInstance['confirmarRemocaoFragmentoConsumido'](0);

      expect(atributosAjustes[0].modificadoresTeste['intelecto']).toBe(0);
      expect(atributosAjustes[0].atributos.intelecto).toBe(dados.atributos.intelecto);
      // Delta original foi 10 (Módulo I) − 40 = −40 pra chegar a 10; reverter soma de volta: 50.
      expect(vitalidadeAjustes).toEqual([{ campo: 'energiaMaxima', valor: 50 }]);
      expect(inventarioAjustes).toEqual([{ itens: [registro.item], amplificadores: [] }]);
      expect(fragmentosAjustes).toEqual([[]]);
    });

    it('tipo DEFESA: reverte o derivado somado', () => {
      const registro: FichaFragmentoConsumidoDto = {
        modulo: FragmentoModuloEnum.III,
        bonusEscolhido: '+3 em Defesa',
        opcao: { rotulo: '+3 em Defesa', tipo: 'DEFESA', valor: 3 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: -24,
        item: itemFragmento(FragmentoModuloEnum.III),
      };
      const documento: FichaJogadorDadosDto = {
        ...dados,
        derivados: { defesa: 16 },
        fragmentosConsumidos: [registro],
      };
      const alvo = montar(documento, 'Corvo', 42, true);
      const derivadoAjustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => derivadoAjustes.push(a));

      alvo.fixture.componentInstance['confirmarRemocaoFragmentoConsumido'](0);

      expect(derivadoAjustes).toEqual([{ chave: 'defesa', valor: 13 }]);
    });

    it('tipo DANO_CORPO: reverte o fixo do dano do Corpo somado via somarDanoFixo', () => {
      const registro: FichaFragmentoConsumidoDto = {
        modulo: FragmentoModuloEnum.III,
        bonusEscolhido: '+6 de dano do Corpo',
        opcao: { rotulo: '+6 de dano do Corpo', tipo: 'DANO_CORPO', valor: 6 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: -24,
        item: itemFragmento(FragmentoModuloEnum.III),
      };
      const documento: FichaJogadorDadosDto = {
        ...dados,
        derivados: { danoCorpoACorpo: '1D3+6 [Físico]' },
        fragmentosConsumidos: [registro],
      };
      const alvo = montar(documento, 'Corvo', 42, true);
      const derivadoAjustes: { chave: string; valor: number | string }[] = [];
      alvo.fixture.componentInstance.ajusteDerivado.subscribe((a) => derivadoAjustes.push(a));

      alvo.fixture.componentInstance['confirmarRemocaoFragmentoConsumido'](0);

      expect(derivadoAjustes).toEqual([{ chave: 'danoCorpoACorpo', valor: '1D3 [Físico]' }]);
    });

    it('remove só o registro pedido, preservando os demais (mais recente primeiro)', () => {
      const registroA: FichaFragmentoConsumidoDto = {
        modulo: FragmentoModuloEnum.V,
        bonusEscolhido: '+1 em Defesa',
        opcao: { rotulo: '+1 em Defesa', tipo: 'DEFESA', valor: 1 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: 0,
        item: itemFragmento(FragmentoModuloEnum.V),
      };
      const registroB: FichaFragmentoConsumidoDto = {
        modulo: FragmentoModuloEnum.IV,
        bonusEscolhido: '+2 em Defesa',
        opcao: { rotulo: '+2 em Defesa', tipo: 'DEFESA', valor: 2 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: 0,
        item: itemFragmento(FragmentoModuloEnum.IV),
      };
      const documento: FichaJogadorDadosDto = {
        ...dados,
        derivados: { defesa: 13 },
        fragmentosConsumidos: [registroA, registroB],
      };
      const alvo = montar(documento, 'Corvo', 42, true);
      const fragmentosAjustes: (readonly FichaFragmentoConsumidoDto[])[] = [];
      alvo.fixture.componentInstance.ajusteFragmentosConsumidos.subscribe((a) => fragmentosAjustes.push(a));

      alvo.fixture.componentInstance['confirmarRemocaoFragmentoConsumido'](0);

      expect(fragmentosAjustes).toEqual([[registroB]]);
    });

    it('índice inexistente: não emite nada', () => {
      const alvo = montar({ ...dados, fragmentosConsumidos: [] }, 'Corvo', 42, true);
      const emitidos: unknown[] = [];
      alvo.fixture.componentInstance.ajusteFragmentosConsumidos.subscribe((a) => emitidos.push(a));
      alvo.fixture.componentInstance.ajusteInventario.subscribe((a) => emitidos.push(a));
      alvo.fixture.componentInstance.ajusteVitalidade.subscribe((a) => emitidos.push(a));

      alvo.fixture.componentInstance['confirmarRemocaoFragmentoConsumido'](0);

      expect(emitidos).toEqual([]);
    });
  });

  describe('Extras (m3-49) — Origem/Personalidade/afinidade de fragmentos na aba "Extras" do Status', () => {
    const origemExemplo: FichaOrigemDto = {
      nome: 'Ex-Militar',
      descricao: 'Serviu nas forças armadas antes de ser recrutado.',
      saberDeCampo: 'Táticas de combate urbano',
      formacao: [
        { bonus: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO, parametro: null, texto: '+1m de Deslocamento' },
      ],
      especialidade: { gatilho: 'Sob fogo direto', efeito: '+1 dado em um teste' },
    };

    /** Monta já na aba "Extras" (evita depender de clique na barra do card de Status). */
    function montarExtras(documento: FichaJogadorDadosDto, ajustavel = false) {
      const alvo = montar(documento, 'Corvo', 42, ajustavel);
      alvo.fixture.componentRef.setInput('abaStatusInicial', 'extras');
      alvo.fixture.detectChanges();
      return alvo;
    }

    function selecionarAbaExtras(raiz: HTMLElement, rotulo: 'Identidade' | 'Fragmentos'): void {
      const botao = Array.from(
        raiz.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
      ).find((item) => item.textContent?.trim() === rotulo);
      expect(botao).toBeTruthy();
      botao!.click();
    }

    function montarFragmentos(documento: FichaJogadorDadosDto, ajustavel = false) {
      const alvo = montarExtras(documento, ajustavel);
      selecionarAbaExtras(alvo.raiz, 'Fragmentos');
      alvo.fixture.detectChanges();
      return alvo;
    }

    it('inicia Extras em Identidade e anuncia a seleção na subbarra', () => {
      const { raiz } = montarExtras({
        ...dados,
        identidade: { personalidade: 'Destemido', origem: origemExemplo },
      });
      const extras = raiz.querySelector('.ficha-extras') as HTMLElement;
      const botoes = Array.from(
        extras.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
      );

      expect(botoes.map((botao) => botao.textContent?.trim())).toEqual(['Identidade', 'Fragmentos']);
      expect(botoes.map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
      expect(extras.textContent).toContain('Patente');
      expect(extras.textContent).toContain('Origem');
      expect(extras.textContent).toContain('Personalidade');
      expect(extras.textContent).not.toContain('Fragmentos Consumidos');
      expect(extras.textContent).not.toContain('Afinidade de Fragmentos');
      expect(extras.textContent).not.toContain('Anomalia Biológica');
    });

    it('mantém a subbarra com ícones fora do painel rolável', () => {
      const { raiz } = montarExtras(dados);
      const extras = raiz.querySelector('.ficha-extras') as HTMLElement;
      const navegacao = extras.querySelector('.ficha-extras__navegacao') as HTMLElement;
      const painel = extras.querySelector('.ficha-extras__painel') as HTMLElement;

      expect(navegacao.querySelectorAll('.ficha-extras__navegacao-icone')).toHaveLength(2);
      expect(painel).toBeTruthy();
      expect(painel.contains(navegacao)).toBe(false);
      expect(painel.textContent).toContain('Patente');
      expect(painel.textContent).toContain('Origem');
      expect(painel.textContent).toContain('Personalidade');
    });

    it('troca para Fragmentos e renderiza somente as seções desse recorte', () => {
      const alvo = montarExtras(dados);

      selecionarAbaExtras(alvo.raiz, 'Fragmentos');
      alvo.fixture.detectChanges();

      const extras = alvo.raiz.querySelector('.ficha-extras') as HTMLElement;
      const botoes = Array.from(
        extras.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
      );
      expect(botoes.map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
      expect(extras.textContent).not.toContain('Patente');
      expect(extras.textContent).not.toContain('Origem');
      expect(extras.textContent).not.toContain('Personalidade');
      expect(extras.textContent).toContain('Fragmentos Consumidos');
      expect(extras.textContent).toContain('Afinidade de Fragmentos');
      expect(extras.textContent).toContain('Anomalia Biológica');
    });

    it('preserva Fragmentos ao sair de Extras e voltar enquanto o componente permanece montado', () => {
      const alvo = montarExtras(dados);
      selecionarAbaExtras(alvo.raiz, 'Fragmentos');
      alvo.fixture.detectChanges();

      alvo.fixture.componentInstance['selecionarAbaStatus']('informacoes');
      alvo.fixture.detectChanges();
      alvo.fixture.componentInstance['selecionarAbaStatus']('extras');
      alvo.fixture.detectChanges();

      const extras = alvo.raiz.querySelector('.ficha-extras') as HTMLElement;
      expect(extras.textContent).toContain('Fragmentos Consumidos');
      expect(
        extras.querySelector<HTMLButtonElement>('.ficha-extras__navegacao-botao--ativa')?.textContent?.trim(),
      ).toBe('Fragmentos');
    });

    /**
     * Registro de `fragmentosConsumidos` completo (m3-64, correção) — os campos além de
     * `modulo`/`bonusEscolhido` só importam para os testes de remoção; aqui bastam valores válidos
     * e reconhecíveis pra não poluir os testes de exibição/prepend que não olham pra eles.
     */
    function registroFragmentoConsumido(
      modulo: FragmentoModuloEnum,
      bonusEscolhido: string,
    ): FichaFragmentoConsumidoDto {
      return {
        modulo,
        bonusEscolhido,
        opcao: { rotulo: bonusEscolhido, tipo: 'DEFESA', valor: 1 },
        atributoEscolhido: null,
        deltaEnergiaMaxima: 0,
        item: {
          nome: 'Fragmento achado',
          categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
          custo: 0,
          peso: 0,
          quantidade: 1,
          guardada: false,
          modificacoes: [],
          modulo,
        },
      };
    }

    it('mostra nome/descrição/Saber de Campo/Especialidade/Formação da Origem definida', () => {
      const { raiz } = montarExtras({ ...dados, identidade: { personalidade: null, origem: origemExemplo } });

      // A seção "Patente" (m3-6x) entrou acima de Origem na aba Extras e reusa a mesma
      // `.ficha-extras__titulo` — escopar por seção em vez de pegar o primeiro título da página.
      const secaoOrigem = Array.from(raiz.querySelectorAll('.ficha-extras__secao')).find((secao) =>
        secao.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim() === 'Origem',
      );
      expect(secaoOrigem?.querySelector('.ficha-extras__titulo')?.textContent?.trim()).toBe('Ex-Militar');
      expect(secaoOrigem?.textContent).toContain('Serviu nas forças armadas antes de ser recrutado.');
      expect(secaoOrigem?.textContent).toContain('Táticas de combate urbano');
      expect(secaoOrigem?.textContent).toContain('Sob fogo direto — +1 dado em um teste');
      const chips = Array.from(secaoOrigem?.querySelectorAll('.ficha-extras__chips .chip') ?? []).map((c) =>
        c.textContent?.trim(),
      );
      expect(chips).toContain('+1m de Deslocamento');
    });

    it('mostra a seção Patente acima de Origem: nome, faixa de Prestígio, salário e os dois limites', () => {
      const { raiz } = montarExtras({ ...dados, prestigio: 12 });

      const secaoPatente = Array.from(raiz.querySelectorAll('.ficha-extras__secao')).find((secao) =>
        secao.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim() === 'Patente',
      );
      expect(secaoPatente?.querySelector('.ficha-extras__titulo')?.textContent?.trim()).toBe('Veterano');
      expect(secaoPatente?.textContent).toContain('12–20');
      expect(secaoPatente?.textContent).toContain('$3.500');
      expect(secaoPatente?.textContent).toContain('3 níveis de empilhamento até 9 modificações no item');
      expect(secaoPatente?.textContent).toContain('Alto');
      expect(secaoPatente?.textContent).toContain('Status de "cliente vip".');
    });

    it('Origem ainda não definida mostra a mensagem de vazio', () => {
      const { raiz } = montarExtras(dados);
      expect(raiz.textContent).toContain('Origem ainda não definida.');
    });

    it('mostra a Personalidade e a descrição da habilidade correspondente (categoria PERSONALIDADE)', () => {
      const { raiz } = montarExtras({
        ...dados,
        identidade: { personalidade: 'Destemido', origem: null },
        habilidades: [
          {
            nome: 'Destemido',
            categoria: HabilidadeCategoriaEnum.PERSONALIDADE,
            custoEnergia: 2,
            descricao: 'Ignora a primeira fonte de Medo em cada cena.',
          },
        ],
      });

      const secaoPersonalidade = Array.from(raiz.querySelectorAll('.ficha-extras__secao')).find((secao) =>
        secao.textContent?.includes('Destemido'),
      );
      expect(secaoPersonalidade?.querySelector('.ficha-extras__titulo')?.textContent?.trim()).toBe('Destemido');
      expect(secaoPersonalidade?.textContent).toContain('Ignora a primeira fonte de Medo em cada cena.');
      expect(secaoPersonalidade?.textContent).toContain('2 E');
    });

    it('Personalidade definida sem habilidade cadastrada avisa "sem habilidade registrada"', () => {
      const { raiz } = montarExtras({ ...dados, identidade: { personalidade: 'Destemido', origem: null } });
      expect(raiz.textContent).toContain('Sem habilidade de Personalidade registrada.');
    });

    it('afinidade soma fragmentos soltos (por unidade do stack) + fragmentos já acoplados como Modificação', () => {
      const itens: CarrinhoItemDto[] = [
        // 2 fragmentos Potencializador módulo V ainda soltos no inventário (mesmo stack, quantidade 2).
        {
          nome: 'Fragmento Potencializador',
          categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
          custo: 0,
          peso: 0,
          quantidade: 2,
          guardada: false,
          modificacoes: [],
          modulo: FragmentoModuloEnum.V,
        },
        // 1 fragmento módulo IV já acoplado a uma arma — vira Modificação com origemFragmento (m3-42).
        {
          nome: 'Pistola',
          categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
          custo: 100,
          peso: 1,
          quantidade: 1,
          guardada: false,
          modificacoes: [
            {
              nome: 'Fragmento Potencializador — Módulo IV',
              empilhamentos: 1,
              efeitos: [],
              origemFragmento: { tipo: FragmentoTipoEnum.POTENCIALIZADOR, modulo: FragmentoModuloEnum.IV },
            },
          ],
        },
      ];
      const { raiz, fixture } = montarFragmentos({ ...dados, inventario: { itens, amplificadores: [] } });

      // Doc — "⬥ Afinidade com Fragmentos": 2× módulo V (1 cada) + 1× módulo IV (2) = 4.
      expect(fixture.componentInstance['afinidadeFragmentos']()).toBe(4);
      const box = Array.from(raiz.querySelectorAll('.ficha-mini')).find(
        (b) => b.querySelector('.ficha-mini__rotulo')?.textContent?.trim() === 'Afinidade',
      );
      expect(box?.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('4');
      // m3-66: agrupado por módulo (quantidade + Afinidade individual), não mais um chip repetido
      // por unidade — "2× Módulo V" reforça a composição da soma, em vez de dois chips idênticos.
      const chips = Array.from(raiz.querySelectorAll('.ficha-extras__chips .chip')).map((c) =>
        c.textContent?.trim(),
      );
      expect(chips).toEqual(['2× Módulo V (2)', 'Módulo IV (2)']);
    });

    it('sem fragmentos portados: afinidade 0 e mensagem de vazio, sem nota de redução', () => {
      const { raiz, fixture } = montarFragmentos(dados);
      expect(fixture.componentInstance['afinidadeFragmentos']()).toBe(0);
      expect(raiz.textContent).toContain('Nenhum fragmento portado.');
      expect(raiz.textContent).not.toContain('Afinidade acima de 10');
    });

    it('afinidade acima de 10 mostra a nota de redução de custo de Energia (m3-42)', () => {
      // 6 fragmentos módulo I (5 cada) = 30 de afinidade → redução de −10 (floor((30-10)/2)).
      const itens: CarrinhoItemDto[] = [
        {
          nome: 'Fragmento Potencializador',
          categoria: ItemCategoriaEnum.FRAGMENTO_POTENCIALIZADOR,
          custo: 0,
          peso: 0,
          quantidade: 6,
          guardada: false,
          modificacoes: [],
          modulo: FragmentoModuloEnum.I,
        },
      ];
      const { raiz, fixture } = montarFragmentos({ ...dados, inventario: { itens, amplificadores: [] } });

      expect(fixture.componentInstance['afinidadeFragmentos']()).toBe(30);
      expect(raiz.textContent).toContain('Afinidade acima de 10: −10 de Energia no custo de fragmentos.');
      const chips = Array.from(raiz.querySelectorAll('.ficha-extras__chips .chip')).map((c) =>
        c.textContent?.trim(),
      );
      expect(chips).toEqual(['6× Módulo I (30)']);
    });

    it('rastro de Fragmentos Consumidos aparece acima de "Afinidade de Fragmentos", mais recente primeiro (m3-64)', () => {
      const documento = {
        ...dados,
        fragmentosConsumidos: [
          registroFragmentoConsumido(FragmentoModuloEnum.III, '+3 em Defesa'),
          registroFragmentoConsumido(FragmentoModuloEnum.V, '+2 de dano do Corpo'),
        ],
      };
      const { raiz } = montarFragmentos(documento);

      const secoes = Array.from(raiz.querySelectorAll('.ficha-extras__secao'));
      const titulos = secoes.map((s) => s.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim());
      const indiceConsumidos = titulos.indexOf('Fragmentos Consumidos');
      const indiceAfinidade = titulos.indexOf('Afinidade de Fragmentos');
      expect(indiceConsumidos).toBeGreaterThanOrEqual(0);
      expect(indiceConsumidos).toBeLessThan(indiceAfinidade);

      const linhas = Array.from(secoes[indiceConsumidos].querySelectorAll('.ficha-extras__linha')).map((linha) => ({
        rotulo: linha.querySelector('.ficha-extras__rotulo')?.textContent?.trim(),
        valor: linha.querySelector('.ficha-extras__valor')?.textContent?.trim(),
      }));
      expect(linhas).toEqual([
        { rotulo: 'Módulo III', valor: '+3 em Defesa' },
        { rotulo: 'Módulo V', valor: '+2 de dano do Corpo' },
      ]);
    });

    it('sem fragmentos consumidos: mensagem de vazio na seção "Fragmentos Consumidos"', () => {
      const { raiz } = montarFragmentos(dados);
      const secao = Array.from(raiz.querySelectorAll('.ficha-extras__secao')).find(
        (s) => s.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim() === 'Fragmentos Consumidos',
      );
      expect(secao?.textContent).toContain('Nenhum fragmento consumido ainda.');
    });

    it('aoRegistrarFragmentoConsumido prepende o novo registro à lista existente e emite ajusteFragmentosConsumidos', () => {
      const registroExistente = registroFragmentoConsumido(FragmentoModuloEnum.V, '+1 em Defesa');
      const documento = { ...dados, fragmentosConsumidos: [registroExistente] };
      const alvo = montar(documento, 'Corvo', 42, true);
      const ajustes: (readonly FichaFragmentoConsumidoDto[])[] = [];
      alvo.fixture.componentInstance.ajusteFragmentosConsumidos.subscribe((a) => ajustes.push(a));

      const registroNovo = registroFragmentoConsumido(FragmentoModuloEnum.I, '+10 de dano do Corpo');
      alvo.fixture.componentInstance['aoRegistrarFragmentoConsumido'](registroNovo);

      expect(ajustes).toEqual([[registroNovo, registroExistente]]);
    });

    it('visualizador (não ajustável): sem botão de remover no registro', () => {
      const registro = registroFragmentoConsumido(FragmentoModuloEnum.V, '+1 em Defesa');
      const { raiz } = montarFragmentos({ ...dados, fragmentosConsumidos: [registro] });
      expect(raiz.querySelector('.ficha-extras__mini-btn')).toBeNull();
    });

    it('dono/mestre: botão ✕ abre a confirmação "Remover?"; cancelar fecha sem remover; confirmar retira a linha', () => {
      const registro = registroFragmentoConsumido(FragmentoModuloEnum.V, '+1 em Defesa');
      const alvo = montarFragmentos({ ...dados, fragmentosConsumidos: [registro] }, true);
      const secao = () =>
        Array.from(alvo.raiz.querySelectorAll('.ficha-extras__secao')).find(
          (s) => s.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim() === 'Fragmentos Consumidos',
        )!;
      const linha = () => secao().querySelector('.ficha-extras__linha') as HTMLElement;

      const ajustes: (readonly FichaFragmentoConsumidoDto[])[] = [];
      alvo.fixture.componentInstance.ajusteFragmentosConsumidos.subscribe((a) => ajustes.push(a));

      const botaoRemover = () =>
        Array.from(linha().querySelectorAll('.ficha-extras__mini-btn')).find(
          (b) => b.getAttribute('aria-label') === 'Remover fragmento consumido',
        ) as HTMLButtonElement | undefined;
      expect(botaoRemover()).toBeDefined();
      botaoRemover()!.click();
      alvo.fixture.detectChanges();
      expect(linha().textContent).toContain('Remover?');

      const botaoCancelar = () =>
        Array.from(linha().querySelectorAll('.ficha-extras__mini-btn')).find(
          (b) => b.getAttribute('aria-label') === 'Cancelar remoção do fragmento consumido',
        ) as HTMLButtonElement;
      botaoCancelar().click();
      alvo.fixture.detectChanges();
      expect(linha().textContent).not.toContain('Remover?');
      expect(ajustes).toEqual([]);

      botaoRemover()!.click();
      alvo.fixture.detectChanges();
      const botaoConfirmar = () =>
        Array.from(linha().querySelectorAll('.ficha-extras__mini-btn')).find(
          (b) => b.getAttribute('aria-label') === 'Confirmar remoção do fragmento consumido',
        ) as HTMLButtonElement;
      botaoConfirmar().click();
      alvo.fixture.detectChanges();

      // Componente controlado (m3-10): o próprio `dados()` só muda quando o hospedeiro re-emite o
      // input após persistir — aqui só cabe conferir o que foi emitido, não o DOM pós-emissão.
      expect(ajustes).toEqual([[]]);
    });
  });

  describe('Limite mínimo de Energia / Anomalia Biológica (m3-67)', () => {
    /** Monta já na aba "Extras" (mesmo helper de `montarExtras` acima). */
    function montarExtras(documento: FichaJogadorDadosDto, ajustavel = false) {
      const alvo = montar(documento, 'Corvo', 42, ajustavel);
      alvo.fixture.componentRef.setInput('abaStatusInicial', 'extras');
      alvo.fixture.componentInstance['selecionarAbaExtras']('fragmentos');
      alvo.fixture.detectChanges();
      return alvo;
    }

    function secaoAnomalia(raiz: HTMLElement) {
      return Array.from(raiz.querySelectorAll('.ficha-extras__secao')).find(
        (s) => s.querySelector('.ficha-cartao__subrotulo')?.textContent?.trim() === 'Anomalia Biológica',
      )!;
    }

    // `dados`: Vigor 4, Destreza 2 → limite mínimo (4+2)×2 = 12. Energia Máxima derivada (sem
    // override) do Combatente nível 3/Destreza 2 é 43 — bem acima do limite, então fora do estado.
    it('limite mínimo é (Vigor + Destreza) × 2; Energia Máxima acima dele: sem Anomalia Biológica', () => {
      const { raiz, fixture } = montarExtras(dados);
      expect(fixture.componentInstance['limiteMinimoEnergia']()).toBe(12);
      expect(fixture.componentInstance['anomaliaBiologica']()).toBe(false);
      const secao = secaoAnomalia(raiz);
      expect(secao.textContent).toContain('12');
      expect(secao.textContent).toContain('dentro do limite');
      expect(secao.textContent).not.toContain('todos os testes');
    });

    it('Energia Máxima atual abaixo do limite: estado derivado true e mostra os efeitos calculados', () => {
      const documento = { ...dados, estado: { ...dados.estado, energiaMaxima: 5 } };
      const { raiz, fixture } = montarExtras(documento);
      expect(fixture.componentInstance['anomaliaBiologica']()).toBe(true);

      const secao = secaoAnomalia(raiz);
      expect(secao.textContent).toContain('Energia Máxima (5)');
      const linhas = Array.from(secao.querySelectorAll('.ficha-extras__linha')).map((linha) => ({
        rotulo: linha.querySelector('.ficha-extras__rotulo')?.textContent?.trim(),
        valor: linha.querySelector('.ficha-extras__valor')?.textContent?.trim(),
      }));
      // Vida Máxima derivada (Combatente nível 3, Vigor 4) = 91 → teto de 10% = 9 (floor).
      expect(linhas).toEqual([
        { rotulo: 'Testes', valor: '-15 em todos os testes' },
        { rotulo: 'Defesa', valor: '-10 em Defesa' },
        { rotulo: 'Vida atual', valor: 'trava em 9 de 91' },
      ]);
    });

    it('Energia Máxima atual igual ao limite: ainda fora do estado (só abaixo entra)', () => {
      const documento = { ...dados, estado: { ...dados.estado, energiaMaxima: 12 } };
      const { fixture } = montarExtras(documento);
      expect(fixture.componentInstance['anomaliaBiologica']()).toBe(false);
    });

    it('visualizador (não ajustável) em Anomalia Biológica: sem o atalho de registrar o trauma', () => {
      const documento = { ...dados, estado: { ...dados.estado, energiaMaxima: 5 } };
      const { raiz } = montarExtras(documento, false);
      expect(secaoAnomalia(raiz).textContent).not.toContain('Limiar da Humanidade');
    });

    it('dono/mestre em Anomalia Biológica: atalho pré-preenche nome/descrição e não dispara sozinho', () => {
      const documento = { ...dados, estado: { ...dados.estado, energiaMaxima: 5 } };
      const alvo = montarExtras(documento, true);
      const ajustes: unknown[] = [];
      alvo.fixture.componentInstance.ajusteSanidade.subscribe((a) => ajustes.push(a));

      const secao = () => secaoAnomalia(alvo.raiz);
      const botaoAbrir = () =>
        Array.from(secao().querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Limiar da Humanidade'),
        ) as HTMLButtonElement;
      expect(botaoAbrir()).toBeDefined();
      // Só abrir o atalho não emite nada — precisa da confirmação explícita.
      expect(ajustes).toEqual([]);

      botaoAbrir().click();
      alvo.fixture.detectChanges();
      expect(secao().textContent).toContain('+2');
      expect(secao().textContent).toContain('-5');
      expect(secao().textContent).toContain('3×');
      expect(ajustes).toEqual([]);

      const botaoCancelar = () =>
        Array.from(secao().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar') as
          | HTMLButtonElement
          | undefined;
      botaoCancelar()!.click();
      alvo.fixture.detectChanges();
      expect(secao().textContent).not.toContain('+2 ao custo');
      expect(ajustes).toEqual([]);

      botaoAbrir().click();
      alvo.fixture.detectChanges();
      const botaoConfirmar = () =>
        Array.from(secao().querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Registrar trauma',
        ) as HTMLButtonElement;
      botaoConfirmar().click();
      alvo.fixture.detectChanges();

      expect(ajustes).toEqual([
        {
          sequelas: dados.estado.sequelas,
          traumas: [
            {
              nome: 'Limiar da Humanidade',
              descricao: expect.stringContaining('+2'),
              tratado: false,
            },
            ...dados.estado.traumas,
          ],
          lesoes: dados.estado.lesoes,
        },
      ]);
    });
  });

  describe('navegação mobile (m3-60) — barra inferior + HUD de vitais', () => {
    it('a barra inferior tem os seis destinos para dono/mestre, começando pelo Agente', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      const destinos = Array.from(raiz.querySelectorAll('.ficha-nav__item')).map((b) =>
        b.getAttribute('data-destino'),
      );
      expect(destinos).toEqual([
        'agente',
        'informacoes',
        'inventario',
        'habilidades',
        'rolagens',
        'extras',
        'historia',
      ]);
    });

    it('o visualizador não vê o destino História (mesma regra da aba)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false, false);
      const destinos = Array.from(raiz.querySelectorAll('.ficha-nav__item')).map((b) =>
        b.getAttribute('data-destino'),
      );
      expect(destinos).not.toContain('historia');
      expect(destinos).toHaveLength(6);
    });

    it('todo destino tem rótulo visível no DOM — nenhum é só ícone', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      const rotulos = Array.from(raiz.querySelectorAll('.ficha-nav__rotulo')).map((r) =>
        r.textContent?.trim(),
      );
      expect(rotulos).toEqual([
        'Agente',
        'Status',
        'Invent.',
        'Habilid.',
        'Rolagens',
        'Extras',
        'História',
      ]);
      // O rótulo curto é o visual; o leitor de tela ouve o nome inteiro pelo aria-label do botão.
      const inventario = raiz.querySelector('[data-destino="inventario"]');
      expect(inventario?.getAttribute('aria-label')).toBe('Inventário');
    });

    it('sem fragmento na URL o destino inicial é o agente, e a linha de colunas entra em modo agente', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      expect(raiz.querySelector('.ficha-visao__linha-colunas--agente')).not.toBeNull();
      expect(raiz.querySelector('[data-destino="agente"]')?.classList).toContain('ficha-nav__item--ativo');
    });

    it('escolher um destino de status sai do modo agente e emite a aba (reflete no # da URL)', () => {
      const { raiz, fixture } = montar(dados, 'Corvo', 42, true, false);
      const emitidas: string[] = [];
      fixture.componentInstance.abaStatusMudou.subscribe((aba) => emitidas.push(aba));

      raiz.querySelector<HTMLButtonElement>('[data-destino="inventario"]')!.click();
      fixture.detectChanges();

      expect(emitidas).toEqual(['inventario']);
      expect(raiz.querySelector('.ficha-visao__linha-colunas--agente')).toBeNull();
      expect(raiz.querySelector('[data-destino="inventario"]')?.classList).toContain(
        'ficha-nav__item--ativo',
      );
    });

    it('um deep-link para uma aba de status abre nela, não no agente', () => {
      const { raiz, fixture } = montar(dados, 'Corvo', 42, true, false);
      fixture.componentRef.setInput('destinoMobileInicial', 'rolagens');
      fixture.detectChanges();

      expect(raiz.querySelector('.ficha-visao__linha-colunas--agente')).toBeNull();
      expect(raiz.querySelector('[data-destino="rolagens"]')?.classList).toContain(
        'ficha-nav__item--ativo',
      );
    });

    it('o HUD não aparece no destino Agente — o card de Identidade já mostra o mesmo Nome/Vida/Energia', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      expect(raiz.querySelector('.ficha-hud')).toBeNull();
    });

    it('voltar ao destino Agente (nav inferior ou HUD) emite \'agente\' — um F5 nele não cai numa aba de Status', () => {
      const { raiz, fixture } = montar(dados, 'Corvo', 42, true, false);
      fixture.componentRef.setInput('destinoMobileInicial', 'inventario');
      fixture.detectChanges();
      const emitidas: string[] = [];
      fixture.componentInstance.abaStatusMudou.subscribe((destino) => emitidas.push(destino));

      raiz.querySelector<HTMLButtonElement>('[data-destino="agente"]')!.click();
      fixture.detectChanges();

      expect(emitidas).toEqual(['agente']);
      expect(raiz.querySelector('.ficha-visao__linha-colunas--agente')).not.toBeNull();
    });

    it('o HUD ecoa nome, Vida/Energia e só as condições ativas (fora do destino Agente)', () => {
      const { raiz, fixture } = montar(
        { ...dados, estado: { ...dados.estado, vidaAtual: 12, energiaAtual: 9, machucado: true } },
        'Dra. Marianna Vasconcellos-Ferreira',
        42,
        true,
        false,
      );
      // O HUD só existe fora do destino Agente (m3-60 follow-up) — lá o card de Identidade já
      // mostra nome + Vida/Energia por extenso, e o HUD duplicaria a mesma informação.
      fixture.componentRef.setInput('destinoMobileInicial', 'informacoes');
      fixture.detectChanges();

      expect(raiz.querySelector('.ficha-hud__nome')?.textContent?.trim()).toBe(
        'Dra. Marianna Vasconcellos-Ferreira',
      );
      const selos = Array.from(raiz.querySelectorAll('.ficha-hud__selo')).map((s) =>
        s.getAttribute('data-selo-condicao'),
      );
      expect(selos).toEqual(['machucado']);
      expect(raiz.querySelector('.ficha-hud__vital--vida .ficha-hud__vital-atual')?.textContent?.trim()).toBe('12');
    });

    it('barra de vitalidade com máxima zero não quebra (divisão por zero)', () => {
      const { fixture } = montar(
        { ...dados, estado: { ...dados.estado, vidaAtual: 0, vidaMaxima: 0, energiaAtual: 0, energiaMaxima: 0 } },
        'Corvo',
        42,
        true,
        false,
      );
      expect(fixture.componentInstance['percentualVida']()).toBe(0);
      expect(fixture.componentInstance['percentualEnergia']()).toBe(0);
    });
  });

  describe('História (m3-50) — aba própria, só dono/mestre', () => {
    it('não mostra o botão da aba nem o painel quando não ajustável (visualizador)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false, false);
      const botoes = Array.from(raiz.querySelectorAll('.ficha-status__aba')).map((b) =>
        b.textContent?.trim(),
      );
      expect(botoes).not.toContain('História');
      expect(raiz.textContent).not.toContain('Sem história definida.');
    });

    it('mostra o botão da aba para dono/mestre (ajustavel)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      const botoes = Array.from(raiz.querySelectorAll('.ficha-status__aba')).map((b) =>
        b.textContent?.trim(),
      );
      expect(botoes).toContain('História');
    });

    it('clicar no botão da aba mostra o texto de história definido', () => {
      const { raiz, fixture } = montar(
        { ...dados, historia: 'Nasceu numa colônia orbital.' },
        'Corvo',
        42,
        true,
        false,
      );
      const botao = Array.from(raiz.querySelectorAll('.ficha-status__aba')).find(
        (b) => b.textContent?.trim() === 'História',
      ) as HTMLButtonElement;
      botao.click();
      fixture.detectChanges();

      expect(raiz.textContent).toContain('Nasceu numa colônia orbital.');
    });

    it('sem historia definida (ou ausente — visualizador nunca chega aqui) mostra a mensagem de vazio', () => {
      const { raiz, fixture } = montar(dados, 'Corvo', 42, true, false);
      fixture.componentRef.setInput('abaStatusInicial', 'historia');
      fixture.detectChanges();

      expect(raiz.textContent).toContain('Sem história definida.');
    });

    it('emite ajusteHistoria com o texto confirmado (blur) quando muda', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false);
      alvo.fixture.componentRef.setInput('abaStatusInicial', 'historia');
      alvo.fixture.detectChanges();
      const emitidos: string[] = [];
      alvo.fixture.componentInstance.ajusteHistoria.subscribe((h) => emitidos.push(h));
      const componente = alvo.fixture.componentInstance;

      componente['editarHistoria']();
      componente['confirmarHistoria']('Nasceu numa colônia orbital.');

      expect(emitidos).toEqual(['Nasceu numa colônia orbital.']);
    });

    it('não emite ajusteHistoria quando o texto confirmado não mudou', () => {
      const alvo = montar({ ...dados, historia: 'Já escrita.' }, 'Corvo', 42, true, false);
      alvo.fixture.componentRef.setInput('abaStatusInicial', 'historia');
      alvo.fixture.detectChanges();
      const emitidos: string[] = [];
      alvo.fixture.componentInstance.ajusteHistoria.subscribe((h) => emitidos.push(h));
      const componente = alvo.fixture.componentInstance;

      componente['editarHistoria']();
      componente['confirmarHistoria']('Já escrita.');

      expect(emitidos).toEqual([]);
    });
  });

  describe('Anotações (m3-51) — gate de visualização igual à História', () => {
    it('não mostra a caixa de anotações quando não ajustável (visualizador)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, false, false);
      expect(raiz.querySelector('.ficha-status__anotacoes-caixa')).toBeNull();
      expect(raiz.textContent).not.toContain('Veterano de contenção.');
    });

    it('mostra a caixa de anotações para dono/mestre (ajustavel)', () => {
      const { raiz } = montar(dados, 'Corvo', 42, true, false);
      expect(raiz.querySelector('.ficha-status__anotacoes-caixa')).not.toBeNull();
      expect(raiz.textContent).toContain('Veterano de contenção.');
    });

    it('anotacoes ausente (omitida no backend pro visualizador) não quebra a leitura', () => {
      const { anotacoes, ...semAnotacoes } = dados;
      const { raiz } = montar(semAnotacoes as FichaJogadorDadosDto, 'Corvo', 42, false, false);
      expect(raiz.querySelector('.ficha-status__anotacoes-caixa')).toBeNull();
    });

    it('emite ajusteAnotacoes com o texto confirmado (blur) quando muda', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false);
      const emitidos: string[] = [];
      alvo.fixture.componentInstance.ajusteAnotacoes.subscribe((a) => emitidos.push(a));
      const componente = alvo.fixture.componentInstance;

      componente['editarAnotacoes']();
      componente['confirmarAnotacoes']('Nova anotação.');

      expect(emitidos).toEqual(['Nova anotação.']);
    });
  });

  describe('podeRolar (m3-51) — visualizador não rola dados', () => {
    it('esconde o dadinho de teste de atributo e rolarTesteAtributo não faz nada sem podeRolar', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false, false);
      expect(alvo.raiz.querySelector('.ficha-atributo__rolar')).toBeNull();
      const spy = vi
        .spyOn(TestBed.inject(BandejaDadosService), 'mostrar')
        .mockImplementation(() => 1);
      alvo.fixture.componentInstance['rolarTesteAtributo'](campoLuta);
      expect(spy).not.toHaveBeenCalled();
    });

    it('mostra o dadinho de teste de atributo e rola quando podeRolar', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false, true);
      expect(alvo.raiz.querySelector('.ficha-atributo__rolar')).not.toBeNull();
      const spy = vi
        .spyOn(TestBed.inject(BandejaDadosService), 'mostrar')
        .mockImplementation(() => 1);
      alvo.fixture.componentInstance['rolarTesteAtributo'](campoLuta);
      expect(spy).toHaveBeenCalled();
    });

    it('rolarDano não faz nada sem podeRolar mesmo com uma fórmula válida', () => {
      const alvo = montar(dados, 'Corvo', 42, true, false, false);
      const spy = vi
        .spyOn(TestBed.inject(BandejaDadosService), 'mostrar')
        .mockImplementation(() => 1);
      alvo.fixture.componentInstance['rolarDano']({
        chave: 'danoCorpoACorpo',
        rotulo: 'Dano C. a C.',
        tipo: 'texto',
        bruto: '2D6',
        display: '2D6',
      });
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
