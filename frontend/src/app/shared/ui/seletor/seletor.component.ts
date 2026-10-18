import {
  Component, ElementRef, Injector, afterNextRender, computed, effect, forwardRef,
  inject, input, signal, viewChild,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

import { Icone, type IconeNome } from "../../icone/icone.component";
import { Botao } from "../botao/botao.component";

export interface SeletorOpcao {
  readonly valor: string;
  readonly rotulo: string;
  readonly icone?: IconeNome;
  readonly desabilitada?: boolean;
}

let sequenciaSeletor = 0;

/** Seleção única com ícones. O popover nativo escapa do recorte de modais sem mover o foco. */
@Component({
  selector: "app-seletor",
  imports: [Botao, Icone],
  templateUrl: "./seletor.component.html",
  styleUrl: "./seletor.component.scss",
  host: { "[attr.data-obrigatorio]": "obrigatorio() ? 'true' : null" },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Seletor), multi: true }],
})
export class Seletor implements ControlValueAccessor {
  readonly rotulo = input.required<string>();
  readonly opcoes = input.required<readonly SeletorOpcao[]>();
  readonly placeholder = input("Escolha…");
  readonly obrigatorio = input(false);
  readonly desabilitado = input(false);

  protected readonly valor = signal<string | null>(null);
  protected readonly desabilitadoPeloFormulario = signal(false);
  protected readonly indisponivel = computed(
    () => this.desabilitado() || this.desabilitadoPeloFormulario(),
  );
  protected readonly selecionada = computed(
    () => this.opcoes().find(opcao => opcao.valor === this.valor()),
  );
  protected readonly aberto = signal(false);
  protected readonly indiceAtivo = signal(-1);
  protected readonly listaId = `seletor-${++sequenciaSeletor}`;
  protected readonly posicao = signal({ esquerda: 0, topo: 0, largura: 0, altura: 0 });

  private readonly gatilho = viewChild.required<Botao, ElementRef<HTMLButtonElement>>("gatilho", { read: ElementRef });
  private readonly lista = viewChild<ElementRef<HTMLElement>>("lista");
  private readonly injector = inject(Injector);
  private alterarValor: (valor: string | null) => void = () => {};
  private marcarTocado: () => void = () => {};
  private textoDigitado = "";
  private ultimaDigitacao = 0;

  constructor() {
    effect(aoLimpar => {
      if (this.indisponivel()) this.fechar();
      if (!this.aberto()) return;
      const fora = (evento: Event): void => {
        const alvo = evento.target as Node;
        if (!this.gatilho().nativeElement.contains(alvo)
          && !this.lista()?.nativeElement.contains(alvo)) {
          this.fechar();
        }
      };
      const reposicionar = (): void => this.reposicionar();
      document.addEventListener("pointerdown", fora, true);
      window.addEventListener("resize", reposicionar);
      window.addEventListener("scroll", reposicionar, true);
      aoLimpar(() => {
        document.removeEventListener("pointerdown", fora, true);
        window.removeEventListener("resize", reposicionar);
        window.removeEventListener("scroll", reposicionar, true);
      });
    });
  }

  writeValue(valor: string | null): void { this.valor.set(valor ?? null); }
  registerOnChange(alterar: (valor: string | null) => void): void { this.alterarValor = alterar; }
  registerOnTouched(tocar: () => void): void { this.marcarTocado = tocar; }
  setDisabledState(desabilitado: boolean): void {
    this.desabilitadoPeloFormulario.set(desabilitado);
  }

  protected idOpcao(indice: number): string { return `${this.listaId}-${indice}`; }

  protected alternar(): void {
    if (this.aberto()) this.fechar();
    else this.abrir();
  }

  private abrir(ultimo = false): void {
    if (this.indisponivel()) return;
    const indices = this.indicesHabilitados();
    if (!indices.length) return;
    const selecionada = this.opcoes().findIndex(
      opcao => opcao.valor === this.valor() && !opcao.desabilitada,
    );
    this.indiceAtivo.set(selecionada >= 0 ? selecionada : indices[ultimo ? indices.length - 1 : 0]);
    this.aberto.set(true);
    afterNextRender(() => {
      const lista = this.lista()?.nativeElement;
      if (!lista) return;
      lista.showPopover?.();
      this.reposicionar();
      this.rolarAteAtiva();
    }, { injector: this.injector });
  }

  protected fechar(): void {
    this.lista()?.nativeElement.hidePopover?.();
    this.aberto.set(false);
    this.textoDigitado = "";
  }

  protected aoSairDoFoco(): void {
    this.marcarTocado();
    this.fechar();
  }

  protected escolher(indice: number, evento?: Event): void {
    // Impede a ativação implícita do botão pelo label de Campo ao clicar numa opção.
    evento?.preventDefault();
    evento?.stopPropagation();
    const opcao = this.opcoes()[indice];
    if (!opcao || opcao.desabilitada || this.indisponivel()) return;
    this.valor.set(opcao.valor);
    this.alterarValor(opcao.valor);
    this.marcarTocado();
    this.fechar();
    this.gatilho().nativeElement.focus();
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (this.indisponivel()) return;
    const tecla = evento.key;
    if (tecla === "Tab") { this.fechar(); return; }
    if (tecla === "Escape") {
      if (!this.aberto()) return;
      evento.preventDefault(); evento.stopPropagation(); this.fechar(); return;
    }
    if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(tecla)) {
      evento.preventDefault(); evento.stopPropagation();
      if (!this.aberto()) { this.abrir(tecla === "ArrowUp" || tecla === "End"); return; }
      if (tecla === "Enter" || tecla === " ") { this.escolher(this.indiceAtivo()); return; }
      const indices = this.indicesHabilitados();
      if (!indices.length) { this.fechar(); return; }
      const atual = indices.indexOf(this.indiceAtivo());
      const proximo = tecla === "Home" ? 0 : tecla === "End" ? indices.length - 1
        : (atual + (tecla === "ArrowDown" ? 1 : -1) + indices.length) % indices.length;
      this.indiceAtivo.set(indices[proximo]);
      this.rolarAposRender();
    } else if (tecla.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      evento.preventDefault();
      if (!this.aberto()) this.abrir();
      const agora = Date.now();
      this.textoDigitado = (agora - this.ultimaDigitacao < 700 ? this.textoDigitado : "") + tecla;
      this.ultimaDigitacao = agora;
      const normalizar = (texto: string): string => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
      const indice = this.opcoes().findIndex(opcao => !opcao.desabilitada
        && normalizar(opcao.rotulo).startsWith(normalizar(this.textoDigitado)));
      if (indice >= 0) this.indiceAtivo.set(indice);
      this.rolarAposRender();
    }
  }

  private indicesHabilitados(): number[] {
    return this.opcoes().flatMap((opcao, indice) => opcao.desabilitada ? [] : [indice]);
  }

  private rolarAposRender(): void {
    afterNextRender(() => this.rolarAteAtiva(), { injector: this.injector });
  }

  private rolarAteAtiva(): void {
    this.lista()?.nativeElement.querySelector<HTMLElement>(`[id="${this.idOpcao(this.indiceAtivo())}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }

  private reposicionar(): void {
    const retangulo = this.gatilho().nativeElement.getBoundingClientRect();
    const margem = 8;
    const abaixo = window.innerHeight - retangulo.bottom - margem;
    const acima = retangulo.top - margem;
    const alturaDesejada = Math.min(280, this.opcoes().length * 44 + 10);
    const abrirAbaixo = abaixo >= alturaDesejada || abaixo >= acima;
    const altura = Math.max(0, Math.min(alturaDesejada, (abrirAbaixo ? abaixo : acima) - 4));
    const largura = Math.min(retangulo.width, window.innerWidth - margem * 2);
    this.posicao.set({
      esquerda: Math.max(margem, Math.min(retangulo.left, window.innerWidth - largura - margem)),
      topo: abrirAbaixo ? retangulo.bottom + 4 : retangulo.top - altura - 4,
      largura, altura,
    });
  }
}
