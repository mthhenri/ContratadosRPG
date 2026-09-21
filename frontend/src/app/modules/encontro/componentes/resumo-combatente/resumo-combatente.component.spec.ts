import { TestBed } from '@angular/core/testing';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  NivelAmeacaEnum,
  TipoDanoEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { ResumoCombatente } from './resumo-combatente.component';

/**
 * Prova a ficha resumida de quem age agora (`ui-37`). O recorte que importa é o que a **regra**
 * impõe: criatura só com Defesa, avulso sem defesas nem resistências, NPC sem Resistências
 * (`resistencias: null`) — o componente desenha o que existe, nunca um zero inventado.
 */
describe('ResumoCombatente', () => {
  const agente: EncontroCombatenteResumoDto = {
    id: 1,
    encontroId: 9,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: 40,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome: 'Marco "Aço" Kessler',
    iniciativa: 17,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaAtual: 34,
    vidaMaxima: 40,
    energiaAtual: 6,
    energiaMaxima: 10,
    defesa: 14,
    esquiva: 12,
    bloqueio: 15,
    contraAtaque: 13,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 4,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: '#d53030',
    imagemUrl: null,
    imagemFoco: null,
    donoNome: 'Marcos',
    classe: ClasseEnum.COMBATENTE,
    arquetipo: ArquetipoEnum.MERCENARIO,
    resistencias: { [TipoDanoEnum.FISICO]: 2, [TipoDanoEnum.BALISTICO]: 1 },
    revelado: true,
  };

  const criatura: EncontroCombatenteResumoDto = {
    ...agente,
    id: 2,
    fichaId: 100,
    tipoFicha: TipoFichaEnum.CRIATURA,
    nome: 'Vetor de Contenção',
    cadencia: CadenciaEnum.DUPLA,
    energiaAtual: null,
    energiaMaxima: null,
    esquiva: null,
    bloqueio: null,
    contraAtaque: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: { [TipoDanoEnum.FISICO]: 3, [TipoDanoEnum.BALISTICO]: 2 },
  };

  const avulso: EncontroCombatenteResumoDto = {
    ...criatura,
    id: 3,
    origem: CombatenteOrigemEnum.AVULSO,
    fichaId: null,
    tipoFicha: null,
    nome: 'Sujeito Contido',
    cadencia: CadenciaEnum.SINGULAR,
    defesa: null,
    resistencias: null,
  };

  function montar(combatente: EncontroCombatenteResumoDto, nivel: NivelAmeacaEnum | null = null) {
    const fixture = TestBed.createComponent(ResumoCombatente);
    fixture.componentRef.setInput('combatente', combatente);
    fixture.componentRef.setInput('nivelAmeaca', nivel);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement };
  }

  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  describe('agente', () => {
    it('mostra retrato com sigla, dono e classe, e o nome', () => {
      const { raiz } = montar(agente);

      expect(texto(raiz.querySelector('.resumo__retrato'))).toBe('MK');
      expect(raiz.querySelector('.resumo__origem')?.textContent).toMatch(/^Marcos\n/);
      expect(texto(raiz.querySelector('.resumo__nome'))).toBe('Marco "Aço" Kessler');
    });

    it('herda a cor da ficha para a hachura', () => {
      const { raiz } = montar(agente);

      expect(raiz.style.getPropertyValue('--cor-ficha')).toBe('#d53030');
    });

    it('mostra Vida e Energia', () => {
      const { raiz } = montar(agente);
      const barras = Array.from(raiz.querySelectorAll('app-barra-recurso')).map((barra) =>
        texto(barra),
      );

      expect(barras).toHaveLength(2);
      expect(barras[0]).toContain('Vida');
      expect(barras[0]).toContain('34');
      expect(barras[1]).toContain('Energia');
    });

    it('lista as quatro Reações, com o nome por extenso', () => {
      const { raiz } = montar(agente);
      const caixas = Array.from(raiz.querySelectorAll('.resumo__reacoes .ficha-mini')).map((caixa) =>
        texto(caixa),
      );

      // Rótulo e valor são dois `span` de bloco: o `textContent` os cola.
      expect(caixas).toEqual(['Defesa14', 'Esquiva12', 'Bloqueio15', 'Contra-ataque13']);
    });

    it('sem Contra-ataque, mostra a caixa tracejada com traço', () => {
      const { raiz } = montar({ ...agente, contraAtaque: null });
      const ausente = raiz.querySelector('.ficha-mini--ausente');

      expect(texto(ausente)).toBe('Contra-ataque—');
    });

    it('lista as cinco Resistências na ordem, com zero onde não há', () => {
      const { raiz } = montar(agente);
      const caixas = Array.from(raiz.querySelectorAll('.resumo__resistencias .ficha-resistencia'));

      expect(caixas.map((caixa) => texto(caixa))).toEqual([
        'Físico2',
        'Balíst.1',
        'Explos.0',
        'Químico0',
        'Geral0',
      ]);
      expect(caixas[0].classList).toContain('ficha-resistencia--fisico');
      expect(caixas[4].classList).toContain('ficha-resistencia--geral');
    });

    it('não mostra os chips de criatura nem a Cadência do agente Singular', () => {
      const { raiz } = montar(agente);

      expect(raiz.querySelectorAll('app-chip')).toHaveLength(0);
    });

    it('emite o pedido de abrir a ficha', () => {
      const { fixture, raiz } = montar(agente);
      const abrir = vi.fn();
      fixture.componentInstance.abrirFicha.subscribe(abrir);

      // O único botão do resumo é o de abrir a ficha (o nome tem aspas, então não vai no seletor).
      const botoes = raiz.querySelectorAll<HTMLButtonElement>('button');
      expect(botoes).toHaveLength(1);
      expect(botoes[0].getAttribute('aria-label')).toBe('Abrir ficha de Marco "Aço" Kessler');

      botoes[0].click();

      expect(abrir).toHaveBeenCalledTimes(1);
    });
  });

  describe('criatura', () => {
    it('só tem Defesa (a regra vence o mockup) e a caixa não estica pela coluna', () => {
      const { raiz } = montar(criatura, NivelAmeacaEnum.ALTA);
      const caixas = Array.from(raiz.querySelectorAll('.resumo__reacoes .ficha-mini')).map((caixa) =>
        texto(caixa),
      );

      expect(caixas).toEqual(['Defesa14']);
      expect(raiz.querySelector('.resumo__reacoes')?.classList).toContain('resumo__reacoes--unica');
      expect(raiz.querySelector('.ficha-mini--ausente')).toBeNull();
    });

    it('mostra o nível de Ameaça e a Cadência em chips', () => {
      const { raiz } = montar(criatura, NivelAmeacaEnum.ALTA);
      const chips = Array.from(raiz.querySelectorAll('app-chip')).map((chip) => texto(chip));

      expect(chips).toEqual(['Ameaça · Alta', 'Cadência 2']);
    });

    it('sem o nível resolvido, o chip diz só "Ameaça"', () => {
      const { raiz } = montar(criatura, null);

      expect(texto(raiz.querySelector('app-chip'))).toBe('Ameaça');
    });

    it('não tem Energia', () => {
      const { raiz } = montar(criatura);

      expect(raiz.querySelectorAll('app-barra-recurso')).toHaveLength(1);
    });
  });

  describe('avulso e NPC', () => {
    it('avulso não tem ficha para abrir, nem Reações, nem Resistências', () => {
      const { raiz } = montar(avulso);

      expect(raiz.querySelector('button')).toBeNull();
      expect(raiz.querySelector('.resumo__reacoes')).toBeNull();
      expect(raiz.querySelector('.resumo__resistencias')).toBeNull();
      expect(raiz.querySelector('.resumo__combate')).toBeNull();
      expect(texto(raiz.querySelector('.resumo__origem'))).toBe('Digitado nesta sessão');
    });

    it('NPC sem contrato de Resistência esconde só o grupo, mantendo as Reações', () => {
      const { raiz } = montar({
        ...agente,
        tipoFicha: TipoFichaEnum.NPC,
        donoNome: null,
        resistencias: null,
      });

      expect(raiz.querySelector('.resumo__resistencias')).toBeNull();
      expect(raiz.querySelectorAll('.resumo__reacoes .ficha-mini')).toHaveLength(4);
      expect(raiz.querySelector('.ficha-mini--ausente')).toBeNull();
    });
  });

  it('com imagem, ela ocupa o retrato no lugar da sigla', () => {
    const { raiz } = montar({ ...agente, imagemUrl: '/imagens/marco.webp' });

    expect(raiz.querySelector('.resumo__retrato img')?.getAttribute('src')).toBe(
      '/imagens/marco.webp',
    );
    expect(texto(raiz.querySelector('.resumo__retrato'))).toBe('');
  });
});
