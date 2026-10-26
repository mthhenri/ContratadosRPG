import {
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from "@angular/core";
import { EstadoVazio } from "../../../../../frontend/src/app/shared/ui/estado-vazio/estado-vazio.component";
import { TipoDanoEnum } from "@contratados-rpg/shared/enums";
import {
  montarFormula,
  rolarFormula,
  type PecaDadoDto,
  type PecaFormulaDto,
} from "@contratados-rpg/shared/regras/rolagem";
import { Botao } from "../../../../../frontend/src/app/shared/ui/botao/botao.component";
import { Campo } from "../../../../../frontend/src/app/shared/ui/campo/campo.component";
import { Chip } from "../../../../../frontend/src/app/shared/ui/chip/chip.component";
import { Segmentado } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado-item.component";
import { StepInput } from "../../../../../frontend/src/app/shared/ui/stepper/step-input.component";
import {
  FichaTermo,
  type FichaTermoCor,
} from "../../../../../frontend/src/app/shared/ui/ficha-termo/ficha-termo.component";
import {
  Icone,
  type IconeNome,
} from "../../../../../frontend/src/app/shared/icone/icone.component";
import {
  ATRIBUTOS_MONTADOR,
  FACES_MONTADOR,
  TIPOS_DANO_MONTADOR,
  REPETICOES_MONTADOR,
  QUANTIDADE_DADOS_MONTADOR,
  adicionarDadoMontador,
  alterarQuantidadeDado,
  aplicarTipoPeca,
  alterarOpcoesDado,
  novaPecaFonte,
  novaPecaNumero,
  lerTipoPeca,
  lerManterDado,
  lerDadoExtra,
  siglaDaFonte,
  nomeDaFonte,
  type ManterDado,
  type DadoExtra,
} from "../../../../../frontend/src/app/shared/montador-rolagem/montador-pecas";
import {
  resumirFormula,
  avaliarExpressaoMontador,
  normalizarExpressao,
  type AmbienteMontador,
} from "../../../../../frontend/src/app/shared/montador-rolagem/montador-leitura";

type TermoPoc = Extract<
  PecaFormulaDto,
  { tipo: "DADO" | "FONTE" | "NUMERO" | "CONTA" }
>;
interface DanoPocEstado {
  pecas: readonly TermoPoc[];
  repeticoes: number;
}
const DADO_INICIAL: PecaDadoDto = {
  tipo: "DADO",
  sinal: 1,
  quantidade: { tipo: "NUMERO", valor: 2 },
  faces: 6,
  tipoDano: TipoDanoEnum.FISICO,
};
const INICIAL: DanoPocEstado = {
  pecas: [DADO_INICIAL, novaPecaFonte("FOR", TipoDanoEnum.FISICO)],
  repeticoes: 1,
};
const ICONES: Readonly<Record<number, IconeNome>> = {
  3: "d3",
  4: "d4",
  6: "d6",
  8: "d8",
  10: "d10",
  12: "d12",
  20: "d20",
};

@Component({
  selector: "app-dano-poc",
  imports: [
    Botao,
    Campo,
    Chip,
    Segmentado,
    SegmentadoItem,
    StepInput,
    Icone,
    FichaTermo,
    EstadoVazio,
  ],
  templateUrl: "./dano.html",
  styleUrls: ["./poc.scss", "./dano.scss"],
})
export class DanoPoc {
  readonly erroNova = computed(() => { const avaliacao = this.expressaoAvaliada(); return avaliacao.valida ? '' : avaliacao.erro; });
  readonly erroEdicao = computed(() => { const avaliacao = this.edicaoAvaliada(); return avaliacao.valida ? '' : avaliacao.erro; });
  readonly ambiente = input.required<AmbienteMontador>();
  readonly livre = input(false);
  readonly estado = linkedSignal<DanoPocEstado>(() =>
    this.livre() ? { pecas: [], repeticoes: 1 } : INICIAL,
  );
  readonly expressaoNova = signal("");
  readonly usoExpressao = signal<"BONUS" | "QUANTIDADE">("BONUS");
  readonly facesExpressao = signal(6);
  readonly expressaoAvaliada = computed(() =>
    avaliarExpressaoMontador(
      this.expressaoNova(),
      this.usoExpressao() === "BONUS"
        ? { tipo: "BONUS" }
        : { tipo: "QUANTIDADE", faces: this.facesExpressao() },
      this.ambiente(),
    ),
  );
  readonly selecionado = signal(0);
  readonly atributoNovo = signal("FOR");
  readonly historico = signal<{ estado: DanoPocEstado; selecionado: number }[]>(
    [],
  );
  readonly resultado = signal("");
  readonly atributos = ATRIBUTOS_MONTADOR;
  readonly faces = FACES_MONTADOR;
  readonly tipos = TIPOS_DANO_MONTADOR;
  readonly tiposBloqueaveis = TIPOS_DANO_MONTADOR.filter(
    (t) => t.tipo !== TipoDanoEnum.GERAL,
  );
  readonly quantidadeMaxima = QUANTIDADE_DADOS_MONTADOR;
  readonly repeticoesMaxima = REPETICOES_MONTADOR;
  readonly termo = computed(
    () =>
      this.estado().pecas[this.selecionado()] ??
      (this.livre() ? { ...DADO_INICIAL, tipoDano: undefined } : DADO_INICIAL),
  );
  readonly expressaoEdicao = linkedSignal(
    () => this.contaDe(this.termo()) ?? "",
  );
  readonly edicaoAvaliada = computed(() =>
    avaliarExpressaoMontador(
      this.expressaoEdicao(),
      this.termo().tipo === "DADO"
        ? { tipo: "QUANTIDADE", faces: (this.termo() as PecaDadoDto).faces }
        : { tipo: "BONUS" },
      this.ambiente(),
    ),
  );
  readonly tipoTermo = computed(() => lerTipoPeca(this.termo()));
  readonly podeDividir = computed(
    () =>
      this.tipoTermo().primeiro !== null &&
      this.tipoTermo().primeiro !== TipoDanoEnum.GERAL,
  );
  readonly manter = computed(() => {
    const t = this.termo();
    return t.tipo === "DADO" ? lerManterDado(t) : "TODOS";
  });
  readonly extra = computed(() => {
    const t = this.termo();
    return t.tipo === "DADO" ? lerDadoExtra(t) : "NENHUM";
  });
  readonly margem = computed(() => {
    const t = this.termo();
    return t.tipo === "DADO" ? (t.margemCritico ?? 0) : 0;
  });
  readonly formula = computed(() =>
    montarFormula({
      pecas: this.estado().pecas,
      ...(this.estado().repeticoes > 1
        ? { repeticoes: this.estado().repeticoes }
        : {}),
    }),
  );
  readonly resumo = computed(() =>
    resumirFormula(this.formula(), this.ambiente()),
  );
  texto(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }
  icone(faces: number): IconeNome {
    return ICONES[faces];
  }
  tipoDe(termo: TermoPoc) {
    return lerTipoPeca(termo);
  }
  cor(tipo: TipoDanoEnum | null): FichaTermoCor | null {
    return this.tipos.find((t) => t.tipo === tipo)?.classe ?? null;
  }
  nomeTipo(tipo: TipoDanoEnum | null): string {
    return this.tipos.find((t) => t.tipo === tipo)?.nome ?? "Sem tipo";
  }
  rotulo(termo: TermoPoc): string {
    if (termo.tipo === "CONTA") return termo.texto;
    if (termo.tipo === "DADO" && termo.quantidade.tipo === "CONTA")
      return "Conta d" + termo.faces;
    if (termo.tipo === "DADO")
      return (
        (termo.quantidade.tipo === "NUMERO" ? termo.quantidade.valor : 1) +
        "d" +
        termo.faces
      );
    if (termo.tipo === "NUMERO")
      return "Bônus " + (termo.sinal === -1 ? "−" : "+") + termo.valor;
    const nome = siglaDaFonte(termo.fonte);
    return (
      nome + ((termo.multiplicador ?? 1) > 1 ? " ×" + termo.multiplicador : "")
    );
  }
  detalhe(termo: TermoPoc): string {
    const tipo = lerTipoPeca(termo);
    const nomes =
      this.nomeTipo(tipo.primeiro) +
      (tipo.segundo ? " / " + this.nomeTipo(tipo.segundo) : "");
    if (termo.tipo === "DADO") return nomes;
    const valor = resumirFormula(
      montarFormula({ pecas: [termo] }),
      this.ambiente(),
    );
    return nomes + (valor ? " · vale " + valor.minimo : "");
  }
  nomeControle(termo: TermoPoc): string {
    return termo.tipo === "DADO"
      ? "Quantidade"
      : termo.tipo === "FONTE"
        ? "Multiplicador"
        : "Valor";
  }
  valorControle(termo: TermoPoc): number {
    if (termo.tipo === "CONTA") return 0;
    return termo.tipo === "DADO"
      ? termo.quantidade.tipo === "NUMERO"
        ? termo.quantidade.valor
        : 1
      : termo.tipo === "FONTE"
        ? (termo.multiplicador ?? 1)
        : termo.valor;
  }
  maximo(termo: TermoPoc): number {
    return termo.tipo === "DADO" ? this.quantidadeMaxima : 999;
  }
  minimo(termo: TermoPoc): number {
    return termo.tipo === "NUMERO" ? 0 : 1;
  }
  alterar(alteracao: Partial<DanoPocEstado>): void {
    this.historico.update((h) => [
      ...h,
      { estado: this.estado(), selecionado: this.selecionado() },
    ]);
    this.estado.update((e) => ({ ...e, ...alteracao }));
    this.resultado.set("");
  }
  selecionar(indice: number): void {
    this.selecionado.set(indice);
  }
  aoFocarLinha(indice: number, event: Event): void {
    const alvo = event.target as HTMLElement;
    if (!alvo.closest(".ficha-termo__remover")) this.selecionar(indice);
  }
  adicionarDado(faces: number): void {
    const atuais = this.estado().pecas;
    const nova = adicionarDadoMontador(
      { pecas: atuais },
      faces,
      this.livre() ? null : TipoDanoEnum.FISICO,
    ).pecas as readonly TermoPoc[];
    const indice =
      nova.length > atuais.length
        ? nova.length - 1
        : nova.findIndex((p, i) => p !== atuais[i]);
    this.alterar({ pecas: nova });
    this.selecionado.set(Math.max(0, indice));
  }
  adicionarFonte(sigla: string): void {
    this.alterar({
      pecas: [
        ...this.estado().pecas,
        novaPecaFonte(sigla, this.livre() ? null : TipoDanoEnum.FISICO),
      ],
    });
    this.selecionado.set(this.estado().pecas.length - 1);
  }
  adicionarNumero(): void {
    this.alterar({
      pecas: [
        ...this.estado().pecas,
        novaPecaNumero(
          1,
          this.livre() ? null : TipoDanoEnum.FISICO,
        ) as TermoPoc,
      ],
    });
    this.selecionado.set(this.estado().pecas.length - 1);
  }
  removerTermo(indice: number): void {
    this.alterar({ pecas: this.estado().pecas.filter((_, i) => i !== indice) });
    this.selecionado.update((s) =>
      Math.max(
        0,
        Math.min(s > indice ? s - 1 : s, this.estado().pecas.length - 1),
      ),
    );
  }
  trocarTermo(termo: TermoPoc, indice = this.selecionado()): void {
    this.alterar({
      pecas: this.estado().pecas.map((p, i) => (i === indice ? termo : p)),
    });
  }
  definirValor(indice: number, valor: number): void {
    const t = this.estado().pecas[indice];
    if (!t) return;
    if (t.tipo === "DADO")
      this.trocarTermo(alterarQuantidadeDado(t, valor), indice);
    else if (t.tipo === "FONTE")
      this.trocarTermo({ ...t, multiplicador: valor }, indice);
    else if (t.tipo === "NUMERO") this.trocarTermo({ ...t, valor }, indice);
  }
  contaDe(termo: TermoPoc): string | null {
    if (termo.tipo === "CONTA") return termo.texto;
    if (termo.tipo === "DADO" && termo.quantidade.tipo === "CONTA")
      return termo.quantidade.texto;
    return null;
  }
  adicionarExpressao(): void {
    if (!this.expressaoAvaliada().valida) return;
    const texto = normalizarExpressao(this.expressaoNova());
    const nova: TermoPoc =
      this.usoExpressao() === "BONUS"
        ? { tipo: "CONTA", sinal: 1, texto }
        : {
            tipo: "DADO",
            sinal: 1,
            quantidade: { tipo: "CONTA", texto },
            faces: this.facesExpressao(),
          };
    this.alterar({ pecas: [...this.estado().pecas, nova] });
    this.selecionado.set(this.estado().pecas.length - 1);
  }
  aplicarConta(): void {
    if (!this.edicaoAvaliada().valida) return;
    const termo = this.termo();
    const texto = normalizarExpressao(this.expressaoEdicao());
    if (termo.tipo === "CONTA") this.trocarTermo({ ...termo, texto });
    else if (termo.tipo === "DADO")
      this.trocarTermo({ ...termo, quantidade: { tipo: "CONTA", texto } });
  }
  definirSinal(sinal: 1 | -1): void {
    this.trocarTermo({ ...this.termo(), sinal });
  }
  escolherTipo(tipo: TipoDanoEnum | null): void {
    this.trocarTermo(
      aplicarTipoPeca(this.termo(), {
        primeiro: tipo,
        segundo: this.tipoTermo().segundo,
      }) as TermoPoc,
    );
  }
  escolherSegundo(tipo: TipoDanoEnum | null): void {
    this.trocarTermo(
      aplicarTipoPeca(this.termo(), {
        primeiro: this.tipoTermo().primeiro,
        segundo: tipo,
      }) as TermoPoc,
    );
  }
  opcoes(opcoes: {
    manter?: ManterDado;
    extra?: DadoExtra;
    margem?: number;
  }): void {
    const t = this.termo();
    if (t.tipo === "DADO") this.trocarTermo(alterarOpcoesDado(t, opcoes));
  }
  escolherExtra(evento: Event): void {
    this.opcoes({ extra: this.texto(evento) as DadoExtra });
  }
  desfazer(): void {
    const anterior = this.historico().at(-1);
    if (!anterior) return;
    this.estado.set(anterior.estado);
    this.selecionado.set(anterior.selecionado);
    this.historico.update((h) => h.slice(0, -1));
    this.resultado.set("");
  }
  restaurar(): void {
    this.alterar(this.livre() ? { pecas: [], repeticoes: 1 } : INICIAL);
    this.selecionado.set(0);
  }
  exemploMisto(): void {
    if (this.livre()) {
      this.alterar({
        pecas: [
          {
            tipo: "DADO",
            sinal: 1,
            quantidade: { tipo: "NUMERO", valor: 2 },
            faces: 6,
          },
          {
            tipo: "DADO",
            sinal: 1,
            quantidade: { tipo: "NUMERO", valor: 1 },
            faces: 8,
          },
          { tipo: "CONTA", sinal: 1, texto: "(FOR+VIG)*2" },
          novaPecaNumero(3, null) as TermoPoc,
        ],
        repeticoes: 1,
      });
      this.selecionado.set(2);
      return;
    }
    this.alterar({
      pecas: [
        DADO_INICIAL,
        { ...novaPecaFonte("FOR", TipoDanoEnum.FISICO), multiplicador: 2 },
        {
          ...DADO_INICIAL,
          faces: 8,
          quantidade: { tipo: "NUMERO", valor: 1 },
          tipoDano: TipoDanoEnum.BALISTICO,
        },
        novaPecaFonte("PROF", TipoDanoEnum.FISICO),
        novaPecaFonte("NIV", TipoDanoEnum.BALISTICO),
      ],
      repeticoes: 1,
    });
    this.selecionado.set(1);
  }
  rolar(): void {
    const r = rolarFormula({ formula: this.formula(), ...this.ambiente() });
    this.resultado.set(
      r ? "Resultado de demonstração: " + r.total : "Não foi possível rolar.",
    );
  }
}
