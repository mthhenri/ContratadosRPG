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

import { CartaoCombatente } from './cartao-combatente.component';

/**
 * Prova o cartão de combatente da tela "Iniciativa" (m7-05). O que importa aqui é o recorte que a
 * **regra** impõe sobre o mockup: criatura sem Esquiva/Bloqueio/Contra, avulso sem defesa nenhuma,
 * e as três condições da ficha lidas (nunca deduzidas da Vida).
 */
describe('CartaoCombatente', () => {
  const base: EncontroCombatenteResumoDto = {
    id: 1,
    encontroId: 9,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: 40,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome: 'K. Amaral',
    iniciativa: 18,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: 1,
    vidaAtual: 31,
    vidaMaxima: 31,
    energiaAtual: 6,
    energiaMaxima: 16,
    defesa: 14,
    esquiva: 15,
    bloqueio: 6,
    contraAtaque: 9,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 4,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: '#4a9d6b',
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: { [TipoDanoEnum.FISICO]: 15, [TipoDanoEnum.QUIMICO]: 5 },
    revelado: true,
  };

  function montar(combatente: EncontroCombatenteResumoDto, entradas: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(CartaoCombatente);
    fixture.componentRef.setInput('combatente', combatente);
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
    return fixture;
  }

  const texto = (fixture: ReturnType<typeof montar>, seletor: string): string =>
    (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';

  /**
   * Os itens da faixa de defesas na forma **longa** (desktop). Cada item carrega os dois rótulos
   * no DOM — o longo e o curto do mobile (m7-08) —, e é o CSS que escolhe qual aparece; o teste lê
   * o longo e o valor, ignorando o curto.
   */
  const defesas = (fixture: ReturnType<typeof montar>): string[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.combatente__defesa'),
    ).map((item) => {
      const longo = item.querySelector('.combatente__rotulo-longo')?.textContent?.trim() ?? '';
      const curto = item.querySelector('.combatente__rotulo-curto')?.textContent?.trim() ?? '';
      const valor = (item.textContent ?? '').replace(longo, '').replace(curto, '').trim();
      return `${longo} ${valor}`;
    });

  it('desenha as quatro defesas do agente', () => {
    const fixture = montar(base);
    expect(defesas(fixture)).toEqual(['Defesa 14', 'Esquiva 15', 'Bloqueio 6', 'Contra 9']);
  });

  it('mostra só Defesa na criatura — ela não reage a ataques (a regra vence o mockup)', () => {
    const fixture = montar(
      {
        ...base,
        tipoFicha: TipoFichaEnum.CRIATURA,
        nome: 'SCP-1471-A',
        defesa: 17,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
        energiaAtual: null,
        energiaMaxima: null,
        morrendo: null,
        machucado: null,
        inconsciente: null,
      },
      { nivelAmeaca: NivelAmeacaEnum.ALTA, emCombate: true },
    );
    expect(defesas(fixture)).toEqual(['Defesa 17']);
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Ameaça · Alta');
  });

  it('não desenha faixa de defesas nem Energia para o avulso', () => {
    const fixture = montar({
      ...base,
      origem: CombatenteOrigemEnum.AVULSO,
      fichaId: null,
      tipoFicha: null,
      nome: 'Sgto. Duarte',
      defesa: null,
      esquiva: null,
      bloqueio: null,
      contraAtaque: null,
      energiaAtual: null,
      energiaMaxima: null,
      morrendo: null,
      machucado: null,
      inconsciente: null,
    });
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.combatente__defesas')).toBeNull();
    expect(elemento.querySelector('.combatente__recurso--energia')).toBeNull();
    expect(texto(fixture, '.combatente__origem')).toBe('Digitado nesta sessão');
  });

  it('mostra a foto da ficha dentro do avatar e mantém o placeholder quando ela não existe', () => {
    const comImagem = montar({
      ...base,
      imagemUrl: '/uploads/fichas/k-amaral.webp',
      imagemFoco: { x: 35, y: 60, escala: 1.5 },
    });
    const imagem = (comImagem.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.combatente__avatar-imagem',
    );

    expect(imagem?.src).toContain('/uploads/fichas/k-amaral.webp');
    expect(imagem?.getAttribute('alt')).toBe('');

    const semImagem = montar(base);
    expect(
      (semImagem.nativeElement as HTMLElement).querySelector('.combatente__avatar-imagem'),
    ).toBeNull();
    expect(
      (semImagem.nativeElement as HTMLElement).querySelector('.combatente__avatar'),
    ).not.toBeNull();
  });

  it('oferece troca de cor, upload e remoção de imagem ao editar um avulso', () => {
    const fixture = montar(
      {
        ...base,
        origem: CombatenteOrigemEnum.AVULSO,
        fichaId: null,
        tipoFicha: null,
        nome: 'Sgto. Duarte',
        imagemUrl: '/uploads/avulso.webp',
      },
      { emEdicao: true },
    );
    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector('input[aria-label="Cor de Sgto. Duarte"]')).not.toBeNull();
    expect(elemento.querySelector('input[aria-label="Trocar imagem de Sgto. Duarte"]')).not.toBeNull();
    expect(elemento.querySelector('button[aria-label="Remover imagem de Sgto. Duarte"]')).not.toBeNull();

    const linhas = elemento.querySelectorAll('.combatente__identidade-linha');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]?.querySelector('input[type="file"]')).not.toBeNull();
    expect(linhas[0]?.querySelector('button[aria-label="Remover imagem de Sgto. Duarte"]')).not.toBeNull();
    expect(linhas[0]?.querySelector('input[type="color"]')).toBeNull();
    expect(linhas[1]?.querySelector('input[type="color"]')).not.toBeNull();
  });

  it('só cita a Cadência quando ela de fato multiplica os turnos', () => {
    const singular = montar({ ...base, donoNome: 'Bia' });
    expect(texto(singular, '.combatente__origem')).toBe('Bia\nAgente');

    const dupla = montar(
      { ...base, tipoFicha: TipoFichaEnum.CRIATURA, cadencia: CadenciaEnum.DUPLA },
      {},
    );
    expect(texto(dupla, '.combatente__origem')).toBe('Criatura da campanha · Cadência 2');
  });

  it('mostra classe e arquétipo na carteirinha do agente, sem nível (m7-16)', () => {
    const fixture = montar({
      ...base,
      donoNome: 'Bia',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
    });
    expect(texto(fixture, '.combatente__origem')).toBe('Bia\nCombatente - Lutador');
  });

  it('dá precedência a "Morrendo" sobre a vez, e some com a etiqueta de turno fora do combate', () => {
    const morrendo = montar({ ...base, morrendo: true }, { ehTurnoAtual: true, emCombate: true });
    expect(texto(morrendo, '.combatente__etiqueta')).toBe('Morrendo');

    const agindo = montar(base, { ehTurnoAtual: true, emCombate: true });
    expect(texto(agindo, '.combatente__etiqueta')).toBe('Age agora');

    const agiu = montar(base, { jaAgiu: true, emCombate: true });
    expect(texto(agiu, '.combatente__etiqueta')).toBe('Já agiu');

    // Encerrado/montagem: não há "vez", então o cartão cai na natureza.
    const foraDeCombate = montar(base, { jaAgiu: true, emCombate: false });
    expect(texto(foraDeCombate, '.combatente__etiqueta')).toBe('Agente');
  });

  it('lê as condições narrativas da ficha em vez de deduzi-las da Vida', () => {
    // Vida cheia + `machucado` marcado à mão: o cartão obedece a flag, não o número (m3-10).
    const fixture = montar({ ...base, vidaAtual: 31, machucado: true, inconsciente: true });
    expect(texto(fixture, '.combatente__narrativo')).toBe('Inconsciente · perde o turno · Machucado');
  });

  it('só oferece os steppers quando o ajuste está liberado', () => {
    const semAjuste = montar(base);
    expect((semAjuste.nativeElement as HTMLElement).querySelectorAll('.combatente__stepper').length)
      .toBe(0);

    const comAjuste = montar(base, { podeAjustar: true });
    // Vida (−/+) e Energia (−/+).
    expect((comAjuste.nativeElement as HTMLElement).querySelectorAll('.combatente__stepper').length)
      .toBe(4);
  });

  it('só oferece o botão "Receber dano" quando o ajuste está liberado (m7-17)', () => {
    const semAjuste = montar(base);
    expect(
      (semAjuste.nativeElement as HTMLElement).querySelector('.combatente__receber-dano'),
    ).toBeNull();

    const comAjuste = montar(base, { podeAjustar: true });
    expect(
      (comAjuste.nativeElement as HTMLElement).querySelector('.combatente__receber-dano'),
    ).not.toBeNull();
  });

  it('confirmar o dano no dialog abate a Vida pelo mesmo canal dos steppers (m7-17)', () => {
    const fixture = montar(base, { podeAjustar: true });

    let deltaEmitido: number | undefined;
    fixture.componentInstance.vidaAjustada.subscribe((delta) => (deltaEmitido = delta));

    // O dialog é controlado pelo próprio cartão (`receberDanoAberto`); simula a confirmação
    // emitindo diretamente o evento que `ReceberDanoDialog` dispararia ao clicar "Receber dano".
    const dialogDebug = fixture.debugElement.query((de) => de.name === 'app-receber-dano-dialog');
    dialogDebug.componentInstance.danoConfirmado.emit(25);

    expect(deltaEmitido).toBe(-25);
  });

  it('clampa o dano do dialog à Vida atual, para o backend nunca rejeitar por Vida negativa (m7-17)', () => {
    // base.vidaAtual = 31 — dano de 60 (maior que a Vida) precisa emitir só -31, nunca -60.
    const fixture = montar(base, { podeAjustar: true });

    let deltaEmitido: number | undefined;
    fixture.componentInstance.vidaAjustada.subscribe((delta) => (deltaEmitido = delta));

    const dialogDebug = fixture.debugElement.query((de) => de.name === 'app-receber-dano-dialog');
    dialogDebug.componentInstance.danoConfirmado.emit(60);

    expect(deltaEmitido).toBe(-31);
  });

  it('acompanha o gatilho de ajuste do mobile, que só existe quando há o que ajustar (m7-08)', () => {
    const semAjuste = montar(base);
    expect((semAjuste.nativeElement as HTMLElement).querySelector('.combatente__ajustar')).toBeNull();

    const fixture = montar(base, { podeAjustar: true });
    const elementoAtual = fixture.nativeElement as HTMLElement;
    const gatilho = elementoAtual.querySelector<HTMLButtonElement>('.combatente__ajustar');
    expect(gatilho?.getAttribute('aria-expanded')).toBe('false');
    expect(elementoAtual.querySelector('.combatente--ajustando')).toBeNull();

    gatilho?.click();
    fixture.detectChanges();
    expect(
      elementoAtual.querySelector<HTMLButtonElement>('.combatente__ajustar')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(elementoAtual.querySelector('.combatente')?.classList).toContain('combatente--ajustando');
  });

  it('carrega o rótulo curto de Energia ao lado do longo, para o CSS escolher (m7-08)', () => {
    const fixture = montar(base);
    const energia = (fixture.nativeElement as HTMLElement).querySelector(
      '.combatente__recurso--energia',
    );
    expect(energia?.querySelector('.combatente__rotulo-longo')?.textContent?.trim()).toBe('Energia');
    expect(energia?.querySelector('.combatente__rotulo-curto')?.textContent?.trim()).toBe('En');
  });

  it('só expõe o campo de iniciativa e o remover no modo de edição explícito', () => {
    const normal = montar(base);
    const elementoNormal = normal.nativeElement as HTMLElement;
    expect(elementoNormal.querySelector('.combatente__iniciativa-campo')).toBeNull();
    expect(elementoNormal.querySelector('.combatente__remover')).toBeNull();

    const edicao = montar(base, { emEdicao: true });
    const elementoEdicao = edicao.nativeElement as HTMLElement;
    expect(elementoEdicao.querySelector('.combatente__iniciativa-campo')).not.toBeNull();
    expect(elementoEdicao.querySelector('.combatente__remover')).not.toBeNull();
  });

  it('não desenha número nenhum do combatente não revelado (m7-06)', () => {
    // É assim que o backend responde ao jogador: identidade da ordem de turno, tudo mais zerado.
    const fixture = montar(
      {
        ...base,
        tipoFicha: TipoFichaEnum.CRIATURA,
        nome: 'SCP-1471-A',
        iniciativa: 21,
        cadencia: CadenciaEnum.DUPLA,
        vidaAtual: 0,
        vidaMaxima: 0,
        energiaAtual: null,
        energiaMaxima: null,
        defesa: null,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
        condicoes: [],
        morrendo: null,
        machucado: null,
        inconsciente: null,
        destreza: 0,
        revelado: false,
      },
      { emCombate: true, nivelAmeaca: NivelAmeacaEnum.ALTA },
    );
    const elemento = fixture.nativeElement as HTMLElement;

    // Sem acesso aos números, o cartão não desenha a linha de recursos — nem um "Vida —" (m7-16).
    expect(elemento.querySelector('.combatente__recursos')).toBeNull();
    expect(elemento.querySelector('.combatente__recurso--vida')).toBeNull();
    expect(elemento.querySelector('.combatente__defesas')).toBeNull();
    // Nem o Nível de Ameaça vaza: dizer "Ameaça · Alta" já entregaria metade do segredo.
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Não revelado');
    // A Cadência fica — quem age duas vezes na rodada age na frente de todo mundo.
    expect(texto(fixture, '.combatente__origem')).toBe('Em campo · Cadência 2');
    expect(texto(fixture, '.combatente__iniciativa-valor')).toBe('21');
  });

  it('o agente de ficha oculta, não revelado, também não se anuncia', () => {
    // `donoNome: null` é como o backend representa "ficha oculta" (m7-16) — sem carteirinha,
    // mesmo tratamento de uma criatura não revelada.
    const fixture = montar(
      { ...base, nome: 'V. Corvalho', donoNome: null, revelado: false, vidaAtual: 0, vidaMaxima: 0, energiaMaxima: null, energiaAtual: null, defesa: null, esquiva: null, bloqueio: null, contraAtaque: null },
      { emCombate: true },
    );
    // Antes da correção o cartão caía no ramo do agente e estampava 'Aguarda' — um estado de
    // combate de uma ficha que este jogador nem pode abrir.
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Não revelado');
    expect(texto(fixture, '.combatente__origem')).toBe('Em campo');
  });

  it('m7-16: o agente de ficha não oculta mostra a carteirinha mesmo sem acesso aos números', () => {
    const fixture = montar(
      {
        ...base,
        nome: 'Max Star',
        donoNome: 'Sirius',
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.LUTADOR,
        imagemUrl: '/uploads/agentes/max-star.webp',
        revelado: false,
        vidaAtual: 0,
        vidaMaxima: 0,
        energiaMaxima: null,
        energiaAtual: null,
        defesa: null,
        esquiva: null,
        bloqueio: null,
        contraAtaque: null,
      },
      { emCombate: true, jaAgiu: true },
    );
    const elemento = fixture.nativeElement as HTMLElement;

    // A carteirinha aparece — dono e classe/arquétipo, em duas linhas — e avatar, mesmo sem
    // `revelado`; o nível fica de fora (a carteirinha identifica, não avalia a força do agente).
    expect(texto(fixture, '.combatente__origem')).toBe('Sirius\nCombatente - Lutador');
    expect(elemento.querySelector('.combatente__avatar-imagem')).not.toBeNull();
    // Os números continuam escondidos — nem a linha de recursos desenha (m7-16, sem "Vida —").
    expect(elemento.querySelector('.combatente__recursos')).toBeNull();
    expect(elemento.querySelector('.combatente__defesas')).toBeNull();
    // A etiqueta segue pro estado de turno normalmente — ordem/iniciativa sempre foram públicas.
    expect(texto(fixture, '.combatente__etiqueta')).toBe('Já agiu');
  });

  it('emite a iniciativa digitada e ignora o campo vazio', () => {
    const fixture = montar(base, { emEdicao: true });
    const emitidos: number[] = [];
    fixture.componentInstance.iniciativaAtribuida.subscribe((valor) => emitidos.push(valor));

    const campo = (fixture.nativeElement as HTMLElement).querySelector(
      '.combatente__iniciativa-campo',
    ) as HTMLInputElement;

    campo.value = '21';
    campo.dispatchEvent(new Event('change'));
    campo.value = '   ';
    campo.dispatchEvent(new Event('change'));

    expect(emitidos).toEqual([21]);
  });

  it('oferece "abrir ficha" quando há fichaId e o combatente está revelado, e emite ao clicar', () => {
    const fixture = montar(base);
    const elemento = fixture.nativeElement as HTMLElement;
    const gatilho = elemento.querySelector<HTMLButtonElement>('.combatente__abrir-ficha');
    expect(gatilho).not.toBeNull();

    let emitido = false;
    fixture.componentInstance.abrirFicha.subscribe(() => (emitido = true));
    gatilho?.click();
    expect(emitido).toBe(true);
  });

  it('não oferece "abrir ficha" pro avulso, mas mantém o atalho de fichas ocultas para o mestre', () => {
    const avulso = montar({ ...base, origem: CombatenteOrigemEnum.AVULSO, fichaId: null });
    expect(
      (avulso.nativeElement as HTMLElement).querySelector('.combatente__abrir-ficha'),
    ).toBeNull();

    const naoRevelado = montar(
      { ...base, revelado: false },
      { ehMestre: true, podeAjustar: false },
    );
    expect(
      (naoRevelado.nativeElement as HTMLElement).querySelector('.combatente__abrir-ficha'),
    ).not.toBeNull();

    const jogadorNaoRevelado = montar({ ...base, revelado: false });
    expect(
      (jogadorNaoRevelado.nativeElement as HTMLElement).querySelector('.combatente__abrir-ficha'),
    ).toBeNull();
  });

  it('oferece o atalho de rolagem ao lado do nome somente para avulso fora da edição', () => {
    const combatenteAvulso = { ...base, origem: CombatenteOrigemEnum.AVULSO, fichaId: null, tipoFicha: null };
    const normal = montar(combatenteAvulso, { podeAjustar: true });
    const botao = (normal.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.combatente__rolar-avulso',
    );
    expect(botao?.getAttribute('aria-label')).toBe('Rolar como K. Amaral');

    let abriu = false;
    normal.componentInstance.rolagemAvulsoAberta.subscribe(() => (abriu = true));
    botao?.click();
    expect(abriu).toBe(true);

    expect((montar(base, { podeAjustar: true }).nativeElement as HTMLElement).querySelector('.combatente__rolar-avulso')).toBeNull();
    expect((montar(combatenteAvulso).nativeElement as HTMLElement).querySelector('.combatente__rolar-avulso')).toBeNull();
    expect((montar(combatenteAvulso, { emEdicao: true }).nativeElement as HTMLElement).querySelector('.combatente__rolar-avulso')).toBeNull();
  });
});
