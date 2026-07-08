import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { palette, updatePrimaryPalette } from '@primeuix/themes';

/**
 * Base do tema — claro ou escuro. O dark base é a identidade do tema "Terminal de Contenção"
 * (SYSTEM.SPEC §8 / docs/design/DESIGN.md); o claro é a variante alternável em runtime desta
 * task (m1-13). A família tipográfica IBM Plex nunca muda (identidade fixa).
 */
export type BaseTema = 'escuro' | 'claro';

/** Preset de accent selecionável em runtime. `cor` é o valor aplicado ao token `--accent`. */
export interface PresetAccent {
  readonly id: string;
  readonly rotulo: string;
  readonly cor: string;
}

/** Preset com a trava de contraste já resolvida para a base atual (ver `updateSwatchLocks`). */
export interface PresetAccentExibicao extends PresetAccent {
  readonly travado: boolean;
}

/**
 * Presets de accent. As quatro primeiras cores são as da paleta do tema (accent/energia/positivo/
 * aviso de `docs/design/tema/_tokens.scss`); as demais são cores principais adicionais pedidas
 * pelo autor (m1-16), mantendo chroma/lightness próximos das oficiais (só o matiz varia) para não
 * destoar da identidade. Todas passam pela mesma trava de contraste por base (`presetsExibicao`) —
 * as ilegíveis na base atual ficam desabilitadas, sem exceção.
 */
export const PRESETS_ACCENT: readonly PresetAccent[] = [
  { id: 'vermelho', rotulo: 'Vermelho', cor: '#d53030' }, // --accent (padrão / identidade)
  { id: 'azul', rotulo: 'Azul', cor: '#4c8dd0' }, // --energy
  { id: 'verde', rotulo: 'Verde', cor: '#4a9d6b' }, // --positive
  { id: 'ambar', rotulo: 'Âmbar', cor: '#d9a441' }, // --warning
  { id: 'roxo', rotulo: 'Roxo', cor: '#9a6dd7' },
  { id: 'rosa', rotulo: 'Rosa', cor: '#d95a9d' },
  { id: 'dourado', rotulo: 'Dourado', cor: '#c9a227' },
  { id: 'turquesa', rotulo: 'Turquesa', cor: '#3bb9b3' },
  { id: 'cinza', rotulo: 'Cinza', cor: '#8b929b' },
];

/** Preset aplicado quando nada foi salvo (o vermelho da identidade). */
const PRESET_PADRAO = PRESETS_ACCENT[0];

/**
 * Overrides de token para a base **clara**. A base escura é a fonte da verdade em
 * `_tokens.scss` (`:root`) — na base escura estes overrides são removidos e o `:root` volta a
 * valer. Este service é a contraparte em runtime de `_tokens.scss` para a parte trocável do
 * tema (accent + base), o único lugar sancionado a conhecer valores de cor fora do SCSS
 * (mesmo racional dos tokens; proibição #29 vale para SCSS/template).
 */
const TOKENS_CLARO: Readonly<Record<string, string>> = {
  '--bg': '#eef0f3',
  '--surface': '#ffffff',
  '--surface-2': '#e7eaee',
  '--border': 'rgba(0, 0, 0, 0.09)',
  '--border-strong': 'rgba(0, 0, 0, 0.16)',
  '--text': '#12151a',
  '--text-dim': '#4a4f57',
  '--text-mute': '#767c85',
  '--grid-line': 'rgba(0, 0, 0, 0.02)',
};

/** Superfície de conteúdo (`--surface`) de cada base — referência da trava de contraste. */
const SUPERFICIE_BASE: Readonly<Record<BaseTema, string>> = {
  escuro: '#13161b',
  claro: '#ffffff',
};

/**
 * Razão de contraste mínima (WCAG) entre o accent e a superfície de conteúdo. Abaixo disso o
 * accent é considerado ilegível e é **travado** (equivalente ao `SIMILAR_THRESHOLD` do site
 * antigo). 3:1 é o piso WCAG AA para componentes de interface / texto grande — o accent é usado
 * como texto de estado ativo e detalhe sobre a superfície.
 */
export const CONTRASTE_MINIMO = 3;

/** Chave de persistência da escolha de tema. */
const CHAVE_PERSISTENCIA = 'contratados-rpg:tema';

interface TemaPersistido {
  base: BaseTema;
  presetId: string;
  accentCustom: string | null;
  accentCustomSalvo: string | null;
}

/**
 * Converte `#rgb`/`#rrggbb` em `[r, g, b]` (0–255). Entradas inesperadas caem em preto — a
 * origem real é sempre um preset do tema ou o `<input type="color">` (`#rrggbb`).
 */
function hexParaRgb(hex: string): [number, number, number] {
  let corpo = hex.replace('#', '').trim();
  if (corpo.length === 3) {
    corpo = corpo
      .split('')
      .map((caractere) => caractere + caractere)
      .join('');
  }
  if (corpo.length !== 6) {
    return [0, 0, 0];
  }
  const vermelho = Number.parseInt(corpo.slice(0, 2), 16);
  const verde = Number.parseInt(corpo.slice(2, 4), 16);
  const azul = Number.parseInt(corpo.slice(4, 6), 16);
  return [vermelho, verde, azul];
}

/**
 * Luminância relativa de uma cor (algoritmo WCAG 2.x) — equivalente ao `relativeLuminance` do
 * site antigo. Função pura; base do cálculo de contraste.
 */
export function luminanciaRelativa(hex: string): number {
  const canais = hexParaRgb(hex).map((valor) => {
    const proporcao = valor / 255;
    return proporcao <= 0.03928 ? proporcao / 12.92 : ((proporcao + 0.055) / 1.055) ** 2.4;
  });
  const [vermelho, verde, azul] = canais;
  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

/**
 * Razão de contraste entre duas cores (WCAG 2.x, de 1 a 21) — equivalente ao `contrastRatio` do
 * site antigo. Função pura.
 */
export function razaoContraste(corA: string, corB: string): number {
  const luminanciaA = luminanciaRelativa(corA);
  const luminanciaB = luminanciaRelativa(corB);
  const maisClara = Math.max(luminanciaA, luminanciaB);
  const maisEscura = Math.min(luminanciaA, luminanciaB);
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

/** Converte `[r, g, b]` (0–255) em `#rrggbb`, saturando cada canal ao intervalo válido. */
function rgbParaHex([vermelho, verde, azul]: [number, number, number]): string {
  const canal = (valor: number): string =>
    Math.max(0, Math.min(255, Math.round(valor)))
      .toString(16)
      .padStart(2, '0');
  return `#${canal(vermelho)}${canal(verde)}${canal(azul)}`;
}

/** Complemento RGB (`255 − canal`) — a "inversão" que resolve o caso branco↔preto. */
function complementoRgb(hex: string): string {
  const [vermelho, verde, azul] = hexParaRgb(hex);
  return rgbParaHex([255 - vermelho, 255 - verde, 255 - azul]);
}

/** Mistura linear entre `hex` e uma cor-alvo (`0` = cor original, `1` = alvo). */
function misturarRgb(hex: string, alvo: [number, number, number], proporcao: number): string {
  const [vermelho, verde, azul] = hexParaRgb(hex);
  const misturar = (canal: number, canalAlvo: number): number =>
    canal + (canalAlvo - canal) * proporcao;
  return rgbParaHex([
    misturar(vermelho, alvo[0]),
    misturar(verde, alvo[1]),
    misturar(azul, alvo[2]),
  ]);
}

/**
 * Variante **legível** de uma cor contra uma superfície (m1-16 — inversão por incompatibilidade
 * de base). Primeiro tenta o **complemento RGB** (resolve branco↔preto, honrando a "inversão" da
 * spec); se ainda não atingir `CONTRASTE_MINIMO`, empurra a luminância da cor original rumo ao
 * extremo que a base pede (preto na base clara, branco na escura) até cruzar o piso. Função pura;
 * mantém `razaoContraste` como base do teste. Como as superfícies das bases são quase-extremas, o
 * passo final (preto/branco puro) sempre passa — `null` só sobra como salvaguarda teórica.
 */
export function variantePorContraste(
  hex: string,
  superficie: string,
  base: BaseTema,
): string | null {
  const complemento = complementoRgb(hex);
  if (razaoContraste(complemento, superficie) >= CONTRASTE_MINIMO) {
    return complemento;
  }
  const alvo: [number, number, number] = base === 'claro' ? [0, 0, 0] : [255, 255, 255];
  for (let passo = 1; passo <= 10; passo += 1) {
    const variante = misturarRgb(hex, alvo, passo / 10);
    if (razaoContraste(variante, superficie) >= CONTRASTE_MINIMO) {
      return variante;
    }
  }
  return null;
}

/** Converte `#rrggbb` em HSL (`matiz` 0–360, `saturacao`/`luminosidade` 0–1). */
function hexParaHsl(hex: string): [number, number, number] {
  const [vermelho255, verde255, azul255] = hexParaRgb(hex);
  const vermelho = vermelho255 / 255;
  const verde = verde255 / 255;
  const azul = azul255 / 255;
  const maximo = Math.max(vermelho, verde, azul);
  const minimo = Math.min(vermelho, verde, azul);
  const luminosidade = (maximo + minimo) / 2;
  const delta = maximo - minimo;
  if (delta === 0) {
    return [0, 0, luminosidade];
  }
  const saturacao = delta / (1 - Math.abs(2 * luminosidade - 1));
  let matiz: number;
  if (maximo === vermelho) {
    matiz = ((verde - azul) / delta) % 6;
  } else if (maximo === verde) {
    matiz = (azul - vermelho) / delta + 2;
  } else {
    matiz = (vermelho - verde) / delta + 4;
  }
  matiz *= 60;
  if (matiz < 0) {
    matiz += 360;
  }
  return [matiz, saturacao, luminosidade];
}

/** Faixas de matiz → nome pt-BR (o limite superior `ate` é exclusivo). */
const FAIXAS_MATIZ: readonly { readonly ate: number; readonly nome: string }[] = [
  { ate: 15, nome: 'Vermelho' },
  { ate: 40, nome: 'Laranja' },
  { ate: 55, nome: 'Dourado' },
  { ate: 70, nome: 'Amarelo' },
  { ate: 90, nome: 'Lima' },
  { ate: 150, nome: 'Verde' },
  { ate: 185, nome: 'Turquesa' },
  { ate: 200, nome: 'Ciano' },
  { ate: 255, nome: 'Azul' },
  { ate: 285, nome: 'Roxo' },
  { ate: 320, nome: 'Magenta' },
  { ate: 345, nome: 'Rosa' },
  { ate: 360, nome: 'Vermelho' },
];

/**
 * Nome **aproximado** (pt-BR) de uma cor a partir de matiz/saturação/luminosidade — rótulo do slot
 * custom salvo (m1-16). Não é classificação exata: cores dessaturadas viram tons de cinza; as
 * demais recebem o nome da faixa de matiz, com qualificador claro/escuro pela luminosidade.
 */
export function nomearCor(hex: string): string {
  const [matiz, saturacao, luminosidade] = hexParaHsl(hex);
  if (saturacao < 0.12) {
    if (luminosidade < 0.12) return 'Preto';
    if (luminosidade > 0.9) return 'Branco';
    if (luminosidade < 0.4) return 'Cinza escuro';
    if (luminosidade > 0.65) return 'Cinza claro';
    return 'Cinza';
  }
  const base = FAIXAS_MATIZ.find((faixa) => matiz < faixa.ate)?.nome ?? 'Vermelho';
  if (luminosidade < 0.28) return `${base} escuro`;
  if (luminosidade > 0.72) return `${base} claro`;
  return base;
}

/**
 * Sistema de troca de tema em runtime (m1-13) — a contraparte em runtime de `_tokens.scss` para
 * a parte trocável do tema. Aplica preset de accent, base clara/escura e accent custom (com
 * **trava de contraste**) escrevendo as CSS custom properties do tema em `<html>`, alternando a
 * classe `.dark` do PrimeNG e regenerando a paleta primária do `ContencaoPreset`. A escolha é
 * persistida (localStorage) e restaurada no boot (`iniciar`).
 *
 * Mapa de paridade com o site antigo (`applyTheme`): `selecionarPreset`≈`setAccent`,
 * `definirBase`≈`setBase`, `definirAccentCustom`≈`setCustomAccent`, `presetsExibicao`≈
 * `updateSwatchLocks`, `accentAlternativoParaBase`≈`fallbackAccentForBase`, `salvar`≈`saveTheme`.
 *
 * m1-16 estende: **slot custom salvo** re-selecionável e persistente (`accentCustomSalvo`/
 * `salvarAccentCustom`/`selecionarAccentSalvo`) e **inversão visual por incompatibilidade de base**
 * (`accentAplicado`/`accentAdaptado`/`variantePorContraste`) — a cor salva é preservada e apenas
 * exibida adaptada quando fica ilegível na base ativa.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);

  private readonly _base = signal<BaseTema>('escuro');
  private readonly _presetId = signal<string>(PRESET_PADRAO.id);
  private readonly _accentCustom = signal<string | null>(null);
  private readonly _accentCustomSalvo = signal<string | null>(null);

  /** Base atual do tema (claro/escuro). */
  readonly base = this._base.asReadonly();

  /** Id do preset de accent selecionado. */
  readonly presetId = this._presetId.asReadonly();

  /** Accent custom escolhido no color picker, ou `null` quando um preset está ativo. */
  readonly accentCustom = this._accentCustom.asReadonly();

  /**
   * Cor custom **salva** como preset re-selecionável (m1-16) — um único slot por vez, persistido
   * junto do estado de tema. Distinto do `accentCustom` "ativo": é a cor guardada, exibida como
   * swatch e reaplicável com um clique.
   */
  readonly accentCustomSalvo = this._accentCustomSalvo.asReadonly();

  /**
   * Accent **selecionado** (valor lógico): o custom quando definido, senão a cor do preset ativo.
   * É a cor que o usuário escolheu/salvou — não necessariamente a exibida (ver `accentAplicado`,
   * que a adapta quando ilegível na base atual).
   */
  readonly accentEfetivo = computed(() => {
    const custom = this._accentCustom();
    if (custom) {
      return custom;
    }
    const preset = PRESETS_ACCENT.find((item) => item.id === this._presetId());
    return (preset ?? PRESET_PADRAO).cor;
  });

  /**
   * Accent efetivamente **escrito** em `--accent` (m1-16): igual ao selecionado quando legível na
   * base atual; senão, uma **variante adaptada e legível** (`variantePorContraste`), sem alterar o
   * valor selecionado/salvo. Ao voltar para a base compatível, o selecionado é reaplicado tal como
   * salvo.
   */
  readonly accentAplicado = computed(() => {
    const selecionado = this.accentEfetivo();
    const base = this._base();
    return this.travadoParaBase(selecionado, base)
      ? this.adaptarParaLegibilidade(selecionado, base)
      : selecionado;
  });

  /** `true` quando o accent selecionado está sendo exibido como variante adaptada (invertida). */
  readonly accentAdaptado = computed(() =>
    this.travadoParaBase(this.accentEfetivo(), this._base()),
  );

  /** `true` quando o slot custom salvo é o accent ativo (swatch salvo selecionado). */
  readonly salvoAtivo = computed(() => {
    const salvo = this._accentCustomSalvo();
    return salvo !== null && this._accentCustom() === salvo;
  });

  /** Nome aproximado (pt-BR) da cor salva, para rotular o swatch — `null` se nada salvo. */
  readonly nomeAccentSalvo = computed(() => {
    const salvo = this._accentCustomSalvo();
    return salvo === null ? null : nomearCor(salvo);
  });

  /**
   * Presets com a trava de contraste resolvida para a base atual (`updateSwatchLocks` do site
   * antigo): a UI desabilita os `travado === true`.
   */
  readonly presetsExibicao = computed<readonly PresetAccentExibicao[]>(() => {
    const base = this._base();
    return PRESETS_ACCENT.map((preset) => ({
      ...preset,
      travado: this.travadoParaBase(preset.cor, base),
    }));
  });

  /**
   * Restaura a escolha persistida e aplica o tema. Chamado no boot (via `provideAppInitializer`),
   * antes da primeira renderização, para evitar flash da base padrão.
   */
  iniciar(): void {
    this.restaurar();
    this.aplicar();
  }

  /**
   * Seleciona um preset de accent. Presets travados pela base atual são ignorados (a UI já os
   * desabilita, mas o guard evita aplicar uma combinação ilegível por outra via).
   */
  selecionarPreset(id: string): void {
    const preset = PRESETS_ACCENT.find((item) => item.id === id);
    if (!preset || this.travadoParaBase(preset.cor, this._base())) {
      return;
    }
    this._accentCustom.set(null);
    this._presetId.set(id);
    this.aplicar();
    this.salvar();
  }

  /**
   * Alterna a base clara/escura. Um **preset fixo** que fica ilegível na nova base cai no accent
   * alternativo seguro (`accentAlternativoParaBase`). Já uma **cor custom** (ativa/salva) é
   * **preservada** e apenas exibida como variante adaptada (`accentAplicado`) — a cor original
   * volta a valer ao retornar para a base compatível (m1-16, substitui o descarte antigo).
   */
  definirBase(base: BaseTema): void {
    this._base.set(base);
    if (!this._accentCustom() && this.travadoParaBase(this.accentEfetivo(), base)) {
      this._presetId.set(this.accentAlternativoParaBase(base).id);
    }
    this.aplicar();
    this.salvar();
  }

  /**
   * Salva a cor informada no **slot custom** (m1-16) e a torna o accent ativo (swatch salvo
   * selecionado). Único por vez: sobrescreve o slot anterior. A cor vem do accent já aplicado
   * (legível na base atual); a legibilidade em outra base é resolvida por `accentAplicado`.
   */
  salvarAccentCustom(hex: string): void {
    this._accentCustomSalvo.set(hex);
    this._accentCustom.set(hex);
    this.aplicar();
    this.salvar();
  }

  /**
   * Re-seleciona o slot custom salvo como accent ativo, **sem** a trava de contraste (diferente de
   * `definirAccentCustom`): se estiver ilegível na base atual, é exibido adaptado, preservando o
   * valor salvo. Sem efeito se nada estiver salvo.
   */
  selecionarAccentSalvo(): void {
    const salvo = this._accentCustomSalvo();
    if (salvo === null) {
      return;
    }
    this._accentCustom.set(salvo);
    this.aplicar();
    this.salvar();
  }

  /**
   * Define um accent custom (color picker). **Trava de contraste**: se o contraste contra a
   * superfície da base atual for insuficiente, não aplica e devolve `false` (combinação
   * ilegível bloqueada — critério de aceite). Devolve `true` quando aplicado.
   */
  definirAccentCustom(hex: string): boolean {
    if (this.estaTravado(hex)) {
      return false;
    }
    this._accentCustom.set(hex);
    this.aplicar();
    this.salvar();
    return true;
  }

  /** Se um accent seria travado (contraste insuficiente) na base atual — usado pelo picker. */
  estaTravado(hex: string): boolean {
    return this.travadoParaBase(hex, this._base());
  }

  /** Accent seguro para uma base: o primeiro preset legível, senão o padrão. */
  accentAlternativoParaBase(base: BaseTema): PresetAccent {
    return PRESETS_ACCENT.find((preset) => !this.travadoParaBase(preset.cor, base)) ?? PRESET_PADRAO;
  }

  private travadoParaBase(hex: string, base: BaseTema): boolean {
    return razaoContraste(hex, SUPERFICIE_BASE[base]) < CONTRASTE_MINIMO;
  }

  /**
   * Variante legível de uma cor selecionada na base atual (m1-16): adapta a própria cor
   * (`variantePorContraste` — complemento/luminância até o piso de contraste); só cai no preset
   * alternativo seguro se nenhuma variante atingir o piso.
   */
  private adaptarParaLegibilidade(hex: string, base: BaseTema): string {
    const variante = variantePorContraste(hex, SUPERFICIE_BASE[base], base);
    return variante ?? this.accentAlternativoParaBase(base).cor;
  }

  /**
   * Escreve o tema no DOM: overrides de base (só na base clara), o token `--accent` (dispara
   * `--accent-dim`/`--accent-border` via `color-mix`), a classe `.dark` do PrimeNG e a paleta
   * primária do preset PrimeNG regenerada a partir do accent.
   */
  private aplicar(): void {
    const raiz = this.documento.documentElement;
    const base = this._base();
    const accent = this.accentAplicado();

    for (const [propriedade, valor] of Object.entries(TOKENS_CLARO)) {
      if (base === 'claro') {
        raiz.style.setProperty(propriedade, valor);
      } else {
        raiz.style.removeProperty(propriedade);
      }
    }

    raiz.style.setProperty('--accent', accent);
    raiz.classList.toggle('dark', base === 'escuro');

    // Mantém a paleta primária do preset PrimeNG (`ContencaoPreset`) em sincronia com o accent —
    // é o que faz os componentes PrimeNG seguirem o preset trocado (deliverable 1). Isolado: uma
    // falha aqui não impede o tema, que já vale pelas CSS custom properties escritas acima.
    try {
      // `palette` gera a escala 50–950 a partir do hex; o retorno é uma união larga, daí o cast.
      updatePrimaryPalette(palette(accent) as Parameters<typeof updatePrimaryPalette>[0]);
    } catch {
      /* paleta PrimeNG é sincronização opcional — o tema já vale pelas CSS custom properties */
    }
  }

  private restaurar(): void {
    let bruto: string | null = null;
    try {
      bruto = this.documento.defaultView?.localStorage.getItem(CHAVE_PERSISTENCIA) ?? null;
    } catch {
      bruto = null;
    }
    if (!bruto) {
      return;
    }

    let persistido: Partial<TemaPersistido>;
    try {
      persistido = JSON.parse(bruto) as Partial<TemaPersistido>;
    } catch {
      return;
    }

    if (persistido.base === 'claro' || persistido.base === 'escuro') {
      this._base.set(persistido.base);
    }
    if (typeof persistido.presetId === 'string' && PRESETS_ACCENT.some((preset) => preset.id === persistido.presetId)) {
      this._presetId.set(persistido.presetId);
    }
    // O slot salvo e o custom ativo são restaurados **sem** a trava de contraste: uma cor que era
    // legível na base em que foi salva pode ficar ilegível na base restaurada — nesse caso ela é
    // exibida adaptada (`accentAplicado`) preservando o valor original (m1-16), não descartada.
    if (typeof persistido.accentCustomSalvo === 'string') {
      this._accentCustomSalvo.set(persistido.accentCustomSalvo);
    }
    if (typeof persistido.accentCustom === 'string') {
      this._accentCustom.set(persistido.accentCustom);
    }
  }

  private salvar(): void {
    const dados: TemaPersistido = {
      base: this._base(),
      presetId: this._presetId(),
      accentCustom: this._accentCustom(),
      accentCustomSalvo: this._accentCustomSalvo(),
    };
    try {
      this.documento.defaultView?.localStorage.setItem(CHAVE_PERSISTENCIA, JSON.stringify(dados));
    } catch {
      /* persistência é best-effort; o tema continua aplicado na sessão mesmo sem storage */
    }
  }
}
