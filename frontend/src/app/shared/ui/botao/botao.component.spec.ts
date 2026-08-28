import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  Botao,
  BotaoEstilo,
  BotaoPosicaoIcone,
  BotaoTamanho,
  BotaoVariante,
} from './botao.component';

/**
 * Prova o primitivo de botão: veste o elemento nativo do consumidor (sem embrulhá-lo), emite as
 * classes BEM canônicas que os seletores contextuais do produto ainda usam, cobre as oito
 * severidades e os quatro estilos que o `p-button` do PrimeNG oferecia (ui-01b), e não engole nem
 * a classe-companheira de tamanho nem o conteúdo projetado.
 */
@Component({
  imports: [Botao],
  template: `
    <button
      app-botao
      [variante]="variante()"
      [estilo]="estilo()"
      [tamanho]="tamanho()"
      [posicaoIcone]="posicaoIcone()"
      [fluido]="fluido()"
      [carregando]="carregando()"
      class="autenticacao__enviar"
      type="submit"
      [disabled]="desabilitado()"
      (click)="cliques.set(cliques() + 1)"
    >
      <span class="rotulo">Entrar</span>
    </button>
    <a app-botao variante="secundario" href="/campanhas">Campanhas</a>
  `,
})
class Hospedeiro {
  readonly variante = signal<BotaoVariante | undefined>('primario');
  readonly estilo = signal<BotaoEstilo | undefined>(undefined);
  readonly tamanho = signal<BotaoTamanho | undefined>(undefined);
  readonly posicaoIcone = signal<BotaoPosicaoIcone | undefined>(undefined);
  readonly fluido = signal(false);
  readonly carregando = signal(false);
  readonly desabilitado = signal(false);
  readonly cliques = signal(0);
}

/** As oito severidades do `ButtonSeverity` do PrimeNG, na nomenclatura do projeto. */
const VARIANTES: BotaoVariante[] = [
  'primario',
  'secundario',
  'positivo',
  'info',
  'aviso',
  'perigo',
  'ajuda',
  'contraste',
];

const ESTILOS: BotaoEstilo[] = ['preenchido', 'contorno', 'texto', 'link'];

describe('Botao', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [Hospedeiro] });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    return fixture;
  }

  function botao(fixture: ReturnType<typeof montar>) {
    return (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  }

  function classes(fixture: ReturnType<typeof montar>) {
    return Array.from(botao(fixture).classList);
  }

  it('veste o <button> do consumidor em vez de embrulhá-lo em um nó novo', () => {
    const fixture = montar();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-botao')).toBeNull();
    expect(botao(fixture).tagName).toBe('BUTTON');
  });

  it('emite a classe base e preserva a classe-companheira de tamanho do consumidor', () => {
    const fixture = montar();

    expect(classes(fixture)).toContain('botao');
    expect(classes(fixture)).toContain('autenticacao__enviar');
  });

  it('renderiza a classe canônica das oito severidades, uma de cada vez', () => {
    const fixture = montar();

    for (const variante of VARIANTES) {
      fixture.componentInstance.variante.set(variante);
      fixture.detectChanges();

      const atuais = classes(fixture);
      expect(atuais).toContain(`botao--${variante}`);
      expect(
        atuais.filter((classe) => VARIANTES.some((outra) => classe === `botao--${outra}`)),
      ).toHaveLength(1);
    }
  });

  it('fica só com a base quando nenhuma variante é informada', () => {
    const fixture = montar();
    fixture.componentInstance.variante.set(undefined);
    fixture.detectChanges();

    expect(classes(fixture)).toContain('botao');
    expect(classes(fixture).filter((classe) => classe.startsWith('botao--'))).toHaveLength(0);
  });

  it('não emite classe de estilo enquanto o estilo não for explícito', () => {
    const fixture = montar();

    expect(classes(fixture).some((classe) => classe.startsWith('botao--estilo-'))).toBe(false);
  });

  it('emite a classe de cada estilo, combinável com qualquer severidade', () => {
    const fixture = montar();

    for (const variante of VARIANTES) {
      for (const estilo of ESTILOS) {
        fixture.componentInstance.variante.set(variante);
        fixture.componentInstance.estilo.set(estilo);
        fixture.detectChanges();

        const atuais = classes(fixture);
        expect(atuais).toContain(`botao--${variante}`);
        expect(atuais).toContain(`botao--estilo-${estilo}`);
      }
    }
  });

  it('não define tamanho sem pedido — o consumidor continua dono da dimensão', () => {
    const fixture = montar();
    const tamanhos: BotaoTamanho[] = ['pequeno', 'medio', 'grande'];

    const temTamanho = () =>
      classes(fixture).some((classe) =>
        tamanhos.some((tamanho) => classe === `botao--${tamanho}`),
      );

    expect(temTamanho()).toBe(false);

    fixture.componentInstance.tamanho.set('medio');
    fixture.detectChanges();
    expect(classes(fixture)).toContain('botao--medio');
  });

  it('posiciona o ícone, ocupa a largura e sinaliza carregamento quando pedido', () => {
    const fixture = montar();
    const posicoes: BotaoPosicaoIcone[] = ['esquerda', 'direita', 'acima', 'abaixo'];

    for (const posicao of posicoes) {
      fixture.componentInstance.posicaoIcone.set(posicao);
      fixture.detectChanges();
      expect(classes(fixture)).toContain(`botao--icone-${posicao}`);
    }

    fixture.componentInstance.fluido.set(true);
    fixture.detectChanges();
    expect(classes(fixture)).toContain('botao--fluido');
  });

  it('mostra o giro e marca aria-busy só enquanto carrega', () => {
    const fixture = montar();

    expect(botao(fixture).querySelector('.botao__carregando')).toBeNull();
    expect(botao(fixture).getAttribute('aria-busy')).toBeNull();

    fixture.componentInstance.carregando.set(true);
    fixture.detectChanges();

    expect(botao(fixture).querySelector('.botao__carregando')).not.toBeNull();
    expect(botao(fixture).getAttribute('aria-busy')).toBe('true');
    expect(classes(fixture)).toContain('botao--carregando');
  });

  it('mantém o conteúdo projetado e os atributos nativos do consumidor', () => {
    const fixture = montar();

    expect(botao(fixture).querySelector('.rotulo')?.textContent?.trim()).toBe('Entrar');
    expect(botao(fixture).type).toBe('submit');
  });

  it('não dispara o clique quando desabilitado', () => {
    const fixture = montar();
    fixture.componentInstance.desabilitado.set(true);
    fixture.detectChanges();

    botao(fixture).click();

    expect(fixture.componentInstance.cliques()).toBe(0);
  });

  it('também veste o <a>, que responde por 6 das chamadas do produto', () => {
    const ancora = (montar().nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;

    expect(ancora.classList.contains('botao')).toBe(true);
    expect(ancora.classList.contains('botao--secundario')).toBe(true);
  });
});
