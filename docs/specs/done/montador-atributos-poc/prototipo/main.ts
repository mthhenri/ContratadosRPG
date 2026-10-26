import { Component, computed, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { DanoPoc } from "./dano";
import { GuiaMontadorPoc } from "./guia";
import {
  montarFormula,
  rolarFormula,
} from "@contratados-rpg/shared/regras/rolagem";
import { Botao } from "../../../../../frontend/src/app/shared/ui/botao/botao.component";
import { Campo } from "../../../../../frontend/src/app/shared/ui/campo/campo.component";
import { Cartao } from "../../../../../frontend/src/app/shared/ui/cartao/cartao.component";
import { Chip } from "../../../../../frontend/src/app/shared/ui/chip/chip.component";
import { Segmentado } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado-item.component";
import { StepInput } from "../../../../../frontend/src/app/shared/ui/stepper/step-input.component";
import { PainelFlutuante } from "../../../../../frontend/src/app/shared/ui/painel-flutuante/painel-flutuante.component";
import { Icone } from "../../../../../frontend/src/app/shared/icone/icone.component";
import {
  ATRIBUTOS_MONTADOR,
  escreverTeste,
  fonteDaSigla,
  type TesteMontador,
} from "../../../../../frontend/src/app/shared/montador-rolagem/montador-pecas";
import {
  contarDadosDoPool,
  type AmbienteMontador,
} from "../../../../../frontend/src/app/shared/montador-rolagem/montador-leitura";

const INICIAL: TesteMontador = {
  atributos: ["FOR"],
  combinacao: "SOMA",
  extra: 0,
  manter: "MAIOR",
  margem: 0,
  proficiencia: false,
  nivel: false,
  bonus: 0,
  repeticoes: 1,
};

@Component({
  selector: "app-poc",
  imports: [
    Botao,
    Campo,
    Cartao,
    Chip,
    Segmentado,
    SegmentadoItem,
    StepInput,
    PainelFlutuante,
    Icone,
    DanoPoc,
    GuiaMontadorPoc,
  ],
  templateUrl: "./poc.html",
  styleUrl: "./poc.scss",
  host: { "(window:resize)": "largura.set(windowWidth())" },
})
class MontadorPoc {
  readonly largura = signal(window.innerWidth);
  readonly aberto = signal(true);
  readonly guiaAberto = signal(false);
  readonly modelo = signal("LIVRE");
  readonly atributos = ATRIBUTOS_MONTADOR;
  readonly estado = signal<TesteMontador>(INICIAL);
  readonly segundo = signal("VIG");
  readonly historico = signal<{ teste: TesteMontador; segundo: string }[]>([]);
  readonly resultado = signal("");
  readonly ambiente: AmbienteMontador = {
    atributos: {
      destreza: 2,
      forca: 3,
      luta: 2,
      pontaria: 1,
      vigor: 2,
      intelecto: 3,
      medicina: 1,
      sentidos: 2,
      social: 2,
      vontade: 1,
    },
    proficiencia: 2,
    nivel: 5,
  };
  readonly mobile = computed(() => this.largura() <= 560);
  readonly altura = signal(window.innerHeight);
  readonly formula = computed(() =>
    montarFormula(escreverTeste(this.estado())),
  );
  readonly dados = computed(() =>
    contarDadosDoPool(this.formula(), this.ambiente),
  );
  readonly modo = computed(() =>
    this.estado().atributos.length === 1 ? "UM" : this.estado().combinacao,
  );
  readonly conta = computed(() => {
    const t = this.estado();
    const primeiro = t.atributos[0];
    if (t.atributos.length === 1) return `${primeiro} ${this.valor(primeiro)}`;
    return this.modo() === "MEDIA"
      ? `(${primeiro} ${this.valor(primeiro)} + ${this.segundo()} ${this.valor(this.segundo())}) ÷ 2, para baixo`
      : `${primeiro} ${this.valor(primeiro)} + ${this.segundo()} ${this.valor(this.segundo())}`;
  });
  windowWidth(): number {
    this.altura.set(window.innerHeight);
    return window.innerWidth;
  }
  valor(sigla: string): number {
    return (
      this.ambiente.atributos[
        fonteDaSigla(sigla) as keyof typeof this.ambiente.atributos
      ] ?? 0
    );
  }
  alterar(alteracao: Partial<TesteMontador>): void {
    this.historico.update((h) => [
      ...h,
      { teste: this.estado(), segundo: this.segundo() },
    ]);
    this.estado.update((t) => ({ ...t, ...alteracao }));
    this.resultado.set("");
  }
  combinar(modo: string): void {
    this.alterar({
      atributos:
        modo === "UM"
          ? [this.estado().atributos[0]]
          : [this.estado().atributos[0], this.segundo()],
      combinacao: modo === "MEDIA" ? "MEDIA" : "SOMA",
    });
  }
  escolher(evento: Event, secundario = false): void {
    const sigla = (evento.target as HTMLSelectElement).value;
    const teste = this.estado();
    this.historico.update((h) => [...h, { teste, segundo: this.segundo() }]);
    if (secundario) this.segundo.set(sigla);
    else if (sigla === this.segundo()) this.segundo.set(teste.atributos[0]);
    const primeiro = secundario ? teste.atributos[0] : sigla;
    this.estado.set({
      ...teste,
      atributos:
        teste.atributos.length === 1 ? [primeiro] : [primeiro, this.segundo()],
    });
    this.resultado.set("");
  }
  desfazer(): void {
    const ultimo = this.historico().at(-1);
    if (!ultimo) return;
    this.estado.set(ultimo.teste);
    this.segundo.set(ultimo.segundo);
    this.historico.update((h) => h.slice(0, -1));
    this.resultado.set("");
  }
  restaurar(): void {
    this.alterar(INICIAL);
    this.segundo.set("VIG");
  }
  rolar(): void {
    const r = rolarFormula({ formula: this.formula(), ...this.ambiente });
    this.resultado.set(
      r ? `Resultado de demonstração: ${r.total}` : "Não foi possível rolar.",
    );
  }
}

bootstrapApplication(MontadorPoc).catch(console.error);
