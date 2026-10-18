import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Seletor, type SeletorOpcao } from "./seletor.component";

@Component({
  imports: [Seletor, ReactiveFormsModule],
  template: `<app-seletor rotulo="Teste" [opcoes]="opcoes" [formControl]="controle" />`,
})
class Exemplo {
  readonly controle = new FormControl<string | null>(null);
  readonly opcoes: readonly SeletorOpcao[] = [
    { valor: "a", rotulo: "Água", icone: "cena-investigacao" },
    { valor: "b", rotulo: "Bloqueada", desabilitada: true },
    { valor: "c", rotulo: "Combate", icone: "cena-combate" },
  ];
}

describe("Seletor", () => {
  function montar() {
    const fixture = TestBed.createComponent(Exemplo);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = raiz.querySelector<HTMLButtonElement>("button")!;
    const teclar = (key: string): void => {
      botao.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    const opcoes = (): HTMLElement[] => Array.from(raiz.querySelectorAll('[role="option"]'));
    return { fixture, raiz, botao, teclar, opcoes, controle: fixture.componentInstance.controle };
  }

  it("reflete valor externo, ícones, seleção e reset sem emitir alterações de usuário", () => {
    const c = montar();
    const alteracoes: unknown[] = [];
    c.controle.valueChanges.subscribe(valor => alteracoes.push(valor));
    c.controle.setValue("c"); c.fixture.detectChanges();
    expect(c.botao.textContent).toContain("Combate");
    expect(c.botao.querySelector("app-icone")).not.toBeNull();
    c.botao.click(); c.fixture.detectChanges();
    expect(c.opcoes()).toHaveLength(3);
    expect(c.opcoes()[2].getAttribute("aria-selected")).toBe("true");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[2].id);
    c.teclar("Escape");
    expect(alteracoes).toEqual(["c"]);
    c.controle.reset(); c.fixture.detectChanges();
    expect(c.botao.textContent).toContain("Escolha…");
  });

  it("navega, pula opção desabilitada e confirma pelo teclado", () => {
    const c = montar();
    c.botao.focus();
    c.teclar("ArrowDown"); c.teclar("ArrowDown");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[2].id);
    expect(c.controle.value).toBeNull();
    c.teclar("Home");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[0].id);
    c.teclar("End"); c.teclar("Enter");
    expect(c.controle.value).toBe("c");
    expect(c.controle.touched).toBe(true);
    expect(c.opcoes()).toHaveLength(0);
    expect(document.activeElement).toBe(c.botao);
  });

  it("seleciona por clique, ignora desabilitada e abre na seleção atual", () => {
    const c = montar();
    c.botao.click(); c.fixture.detectChanges();
    c.opcoes()[1].click(); c.fixture.detectChanges();
    expect(c.controle.value).toBeNull();
    c.opcoes()[2].click(); c.fixture.detectChanges();
    expect(c.controle.value).toBe("c");
    expect(c.botao.getAttribute("aria-expanded")).toBe("false");
    c.teclar(" ");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[2].id);
  });

  it("Escape cancela somente a lista e Tab/blur fecham sem mudar o valor", () => {
    const c = montar();
    c.controle.setValue("a"); c.fixture.detectChanges();
    c.teclar("Enter"); c.teclar("End");
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    c.botao.dispatchEvent(escape); c.fixture.detectChanges();
    expect(escape.defaultPrevented).toBe(true);
    expect(c.controle.value).toBe("a");
    c.teclar("Enter"); c.teclar("Tab");
    expect(c.opcoes()).toHaveLength(0);
    c.teclar("Enter"); c.botao.dispatchEvent(new Event("blur")); c.fixture.detectChanges();
    expect(c.controle.touched).toBe(true);
    expect(c.opcoes()).toHaveLength(0);
  });

  it("localiza por letras desconsiderando acentos e fecha por clique fora", () => {
    const c = montar();
    c.teclar("a");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[0].id);
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })); c.fixture.detectChanges();
    expect(c.opcoes()).toHaveLength(0);
    expect(c.controle.value).toBeNull();
  });

  it("disabled do formulário impede abrir e fecha uma lista já aberta", () => {
    const c = montar();
    c.teclar("ArrowUp");
    expect(c.botao.getAttribute("aria-activedescendant")).toBe(c.opcoes()[2].id);
    c.controle.disable(); c.fixture.detectChanges();
    expect(c.botao.disabled).toBe(true);
    expect(c.opcoes()).toHaveLength(0);
    c.teclar("Enter");
    expect(c.opcoes()).toHaveLength(0);
    c.controle.enable(); c.fixture.detectChanges(); c.teclar("Enter");
    expect(c.opcoes()).toHaveLength(3);
  });
});
