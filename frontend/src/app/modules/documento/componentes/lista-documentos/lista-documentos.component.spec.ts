import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type {
  DocumentoOrganizacaoRecuperadaDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum, TipoDocumentoOrganizacaoEnum } from '@contratados-rpg/shared/enums';

import { BibliotecaOrganizacaoStore } from '../../biblioteca-organizacao.store';
import { DocumentoMovimento, ListaDocumentos } from './lista-documentos.component';

const documento = (id: number, titulo: string): DocumentoResumoDto => ({
  id,
  campanhaId: 5,
  titulo,
  tipo: TipoDocumentoEnum.TEXTO,
  imagemUrl: null,
  revelado: true,
  ordem: id,
  updatedDate: '2026-10-16T12:00:00.000000Z',
});

const carta = documento(1, 'Carta');
const mapa = documento(2, 'Mapa');
const diario = documento(3, 'Diário');
const relatorio = documento(4, 'Relatório');

const organizacaoBase = (
  editavel = true,
  tipo = TipoDocumentoOrganizacaoEnum.JOGADOR,
): DocumentoOrganizacaoRecuperadaDto => ({
  campanhaId: 5,
  organizacao: tipo,
  editavel,
  pastas: [
    { id: 10, nome: 'Pistas', pastaMaeId: null, ordem: 1 },
    { id: 11, nome: 'Cidade', pastaMaeId: 10, ordem: 1 },
  ],
  vinculos: [
    { documentoId: 2, pastaId: 10, ordem: 1 },
    { documentoId: 3, pastaId: 10, ordem: 2 },
    { documentoId: 4, pastaId: 11, ordem: 1 },
  ],
});

@Component({
  imports: [ListaDocumentos],
  template: `<app-lista-documentos
    [documentos]="documentos()"
    [carregando]="carregando()"
    [abertoId]="abertoId()"
    [ordenavel]="ordenavel()"
    vazioTitulo="Nada por aqui."
    vazioApoio="Sem documentos."
    (selecionar)="selecionados.push($event)"
    (mover)="movimentos.push($event)"
  />`,
})
class Hospedeiro {
  readonly documentos = signal<readonly DocumentoResumoDto[]>([carta, mapa, diario, relatorio]);
  readonly carregando = signal(false);
  readonly abertoId = signal<number | null>(null);
  readonly ordenavel = signal(false);
  readonly selecionados: number[] = [];
  readonly movimentos: DocumentoMovimento[] = [];
}

describe('ListaDocumentos', () => {
  function montar(opcoes: { organizacao?: DocumentoOrganizacaoRecuperadaDto | null; semStore?: boolean } = {}) {
    const organizacao = signal<DocumentoOrganizacaoRecuperadaDto | null>(
      opcoes.organizacao === undefined ? organizacaoBase() : opcoes.organizacao,
    );
    const emOperacao = signal(false);
    const resposta = () => of({});
    const store = {
      organizacao: organizacao.asReadonly(),
      editavel: () => organizacao()?.editavel ?? false,
      emOperacao: emOperacao.asReadonly(),
      criarPasta: vi.fn(resposta),
      renomearPasta: vi.fn(resposta),
      moverPasta: vi.fn(resposta),
      removerPasta: vi.fn(resposta),
      moverDocumento: vi.fn(resposta),
    };
    TestBed.configureTestingModule({
      imports: [Hospedeiro],
      providers: opcoes.semStore ? [] : [{ provide: BibliotecaOrganizacaoStore, useValue: store }],
    });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, host: fixture.componentInstance, store, organizacao };
  }

  const nomes = (raiz: HTMLElement): string[] =>
    Array.from(
      raiz.querySelectorAll('.pasta-linha__nome, .documento-cartao__nome'),
      (elemento) => elemento.textContent?.trim() ?? '',
    );

  const botaoPorRotulo = (raiz: HTMLElement, rotulo: string): HTMLButtonElement | null =>
    raiz.querySelector(`button[aria-label="${rotulo}"]`);

  const botaoPorTexto = (raiz: HTMLElement, texto: string): HTMLButtonElement | undefined =>
    Array.from(raiz.querySelectorAll('button')).find((botao) =>
      botao.textContent?.includes(texto),
    );

  describe('navegação', () => {
    it('sem a organização provida (seletor do Caderno), segue plana e sem controles de pasta', () => {
      const { raiz } = montar({ semStore: true });

      expect(nomes(raiz)).toEqual(['Carta', 'Mapa', 'Diário', 'Relatório']);
      expect(raiz.querySelector('.lista-documentos__barra')).toBeNull();
    });

    it('mostra as pastas recolhidas com a contagem e os documentos soltos da raiz', () => {
      const { raiz } = montar();

      expect(nomes(raiz)).toEqual(['Pistas', 'Carta']);
      expect(raiz.querySelector('.pasta-linha__contagem')?.textContent?.trim()).toBe('3');
    });

    it('expandir a pasta revela subpastas e documentos; recolher esconde de novo', () => {
      const { fixture, raiz } = montar();
      const alternar = () =>
        (raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement).click();

      alternar();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Pistas', 'Cidade', 'Mapa', 'Diário', 'Carta']);

      alternar();
      fixture.detectChanges();
      expect(nomes(raiz)).toEqual(['Pistas', 'Carta']);
    });

    it('abrir um documento que mora numa pasta expande a pasta e as ancestrais', () => {
      const { fixture, raiz, host } = montar();

      host.abertoId.set(4);
      fixture.detectChanges();

      expect(nomes(raiz)).toContain('Relatório');
      expect(nomes(raiz)).toContain('Cidade');
    });

    it('clicar num documento o seleciona', () => {
      const { raiz, host } = montar();

      (raiz.querySelector('.documento-cartao') as HTMLButtonElement).click();

      expect(host.selecionados).toEqual([1]);
    });

    it('sem nenhum documento nem pasta mostra o estado vazio', () => {
      const { fixture, raiz, host } = montar({ organizacao: null });
      host.documentos.set([]);
      fixture.detectChanges();

      expect(raiz.querySelector('app-estado-vazio')).not.toBeNull();
    });

    it('só com pastas e sem documentos, ainda mostra a árvore', () => {
      const { fixture, raiz, host } = montar();
      host.documentos.set([]);
      fixture.detectChanges();

      expect(raiz.querySelector('app-estado-vazio')).toBeNull();
      expect(nomes(raiz)).toEqual(['Pistas']);
    });
  });

  describe('permissão', () => {
    it('o espectador (não editável) só navega: sem Nova pasta, Organizar nem ações', () => {
      const { raiz } = montar({ organizacao: organizacaoBase(false) });

      expect(raiz.querySelector('.lista-documentos__barra')).toBeNull();
      expect(raiz.querySelector('[aria-haspopup="menu"]')).toBeNull();
    });

    it('quem edita vê Nova pasta e Organizar', () => {
      const { raiz } = montar();

      expect(botaoPorTexto(raiz, 'Nova pasta')).toBeDefined();
      expect(botaoPorTexto(raiz, 'Organizar')).toBeDefined();
    });
  });

  describe('organizar', () => {
    it('as ações por item só aparecem depois de ligar o modo Organizar', () => {
      const { fixture, raiz } = montar();
      expect(botaoPorRotulo(raiz, 'Ações da pasta Pistas')).toBeNull();

      botaoPorTexto(raiz, 'Organizar')!.click();
      fixture.detectChanges();

      expect(botaoPorRotulo(raiz, 'Ações da pasta Pistas')).not.toBeNull();
      expect(botaoPorRotulo(raiz, 'Ações de Carta')).not.toBeNull();
      expect(botaoPorTexto(raiz, 'Concluir')).toBeDefined();

      botaoPorTexto(raiz, 'Concluir')!.click();
      fixture.detectChanges();
      expect(botaoPorRotulo(raiz, 'Ações da pasta Pistas')).toBeNull();
    });

    it('"Nova pasta" pede o nome e cria na raiz', () => {
      const { fixture, raiz, store } = montar();

      botaoPorTexto(raiz, 'Nova pasta')!.click();
      fixture.detectChanges();
      const campo = raiz.querySelector('app-pasta-nome-dialog input') as HTMLInputElement;
      campo.value = '  Mapas  ';
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      (raiz.querySelector('app-pasta-nome-dialog form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();

      expect(store.criarPasta).toHaveBeenCalledWith('Mapas', null);
      expect(raiz.querySelector('app-pasta-nome-dialog')).toBeNull();
    });

    it('arrastar só vale no modo Organizar: o documento fica arrastável e a pasta recebe o drop', () => {
      const { fixture, raiz, store } = montar();
      expect(raiz.querySelector('.documento-cartao')?.getAttribute('draggable')).toBeNull();

      botaoPorTexto(raiz, 'Organizar')!.click();
      fixture.detectChanges();
      const cartao = raiz.querySelector('.documento-cartao') as HTMLElement;
      expect(cartao.getAttribute('draggable')).toBe('true');

      cartao.dispatchEvent(new Event('dragstart'));
      fixture.detectChanges();
      expect(raiz.querySelector('.lista-documentos__raiz')).not.toBeNull();

      const pasta = raiz.querySelector('.pasta-linha') as HTMLElement;
      pasta.dispatchEvent(new Event('dragover', { cancelable: true }));
      fixture.detectChanges();
      expect(pasta.classList.contains('pasta-linha--alvo')).toBe(true);

      pasta.dispatchEvent(new Event('drop', { cancelable: true }));
      fixture.detectChanges();
      expect(store.moverDocumento).toHaveBeenCalledWith(1, 10);
    });

    it('soltar na raiz tira o documento da pasta; soltar onde ele já está não faz nada', () => {
      const { fixture, raiz, store } = montar();
      botaoPorTexto(raiz, 'Organizar')!.click();
      (raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const mapaCartao = Array.from(raiz.querySelectorAll('.documento-cartao')).find((cartao) =>
        cartao.textContent?.includes('Mapa'),
      ) as HTMLElement;
      mapaCartao.dispatchEvent(new Event('dragstart'));
      fixture.detectChanges();
      const alvoRaiz = raiz.querySelector('.lista-documentos__raiz') as HTMLElement;
      alvoRaiz.dispatchEvent(new Event('drop', { cancelable: true }));

      expect(store.moverDocumento).toHaveBeenCalledWith(2, null);

      // Um documento da raiz solto na raiz já está lá: o alvo nem aceita.
      store.moverDocumento.mockClear();
      const cartaCartao = Array.from(raiz.querySelectorAll('.documento-cartao')).find((cartao) =>
        cartao.textContent?.includes('Carta'),
      ) as HTMLElement;
      cartaCartao.dispatchEvent(new Event('dragstart'));
      fixture.detectChanges();
      raiz
        .querySelector('.lista-documentos__raiz')
        ?.dispatchEvent(new Event('drop', { cancelable: true }));
      expect(store.moverDocumento).not.toHaveBeenCalled();
    });

    it('uma pasta não aceita ser solta sobre si mesma nem sobre uma descendente', () => {
      const { fixture, raiz, store } = montar();
      botaoPorTexto(raiz, 'Organizar')!.click();
      (raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const pastas = raiz.querySelectorAll('.pasta-linha');
      pastas[0].dispatchEvent(new Event('dragstart'));
      fixture.detectChanges();
      pastas[0].dispatchEvent(new Event('drop', { cancelable: true }));
      pastas[1].dispatchEvent(new Event('drop', { cancelable: true }));

      expect(store.moverPasta).not.toHaveBeenCalled();
    });
  });

  describe('menu de ações (o equivalente ao arrastar, também no toque)', () => {
    async function abrirMenuDaPasta(
      fixture: ReturnType<typeof montar>['fixture'],
      raiz: HTMLElement,
      rotulo: string,
    ): Promise<void> {
      botaoPorTexto(raiz, 'Organizar')!.click();
      fixture.detectChanges();
      botaoPorRotulo(raiz, rotulo)!.click();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    const itemDoMenu = (raiz: HTMLElement, texto: string): HTMLElement | undefined =>
      Array.from(raiz.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) =>
        item.textContent?.includes(texto),
      );

    it('excluir pasta não pede confirmação e nunca é bloqueado', async () => {
      const { fixture, raiz, store } = montar();
      await abrirMenuDaPasta(fixture, raiz, 'Ações da pasta Pistas');

      itemDoMenu(raiz, 'Excluir pasta')!.click();

      expect(store.removerPasta).toHaveBeenCalledWith(10);
    });

    it('a única pasta da raiz não sobe nem desce; a subpasta vira destino de "Nova subpasta"', async () => {
      const { fixture, raiz, store } = montar();
      await abrirMenuDaPasta(fixture, raiz, 'Ações da pasta Pistas');

      expect(itemDoMenu(raiz, 'Subir na ordem')?.getAttribute('aria-disabled')).toBe('true');
      expect(itemDoMenu(raiz, 'Descer na ordem')?.getAttribute('aria-disabled')).toBe('true');

      itemDoMenu(raiz, 'Nova subpasta')!.click();
      fixture.detectChanges();
      const campo = raiz.querySelector('app-pasta-nome-dialog input') as HTMLInputElement;
      campo.value = 'Porto';
      campo.dispatchEvent(new Event('input'));
      (raiz.querySelector('app-pasta-nome-dialog form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );

      expect(store.criarPasta).toHaveBeenCalledWith('Porto', 10);
    });

    it('"Mover para…" de um documento abre o seletor de destino, com a pasta atual escolhida', async () => {
      const { fixture, raiz } = montar();
      await abrirMenuDaPasta(fixture, raiz, 'Ações de Carta');

      itemDoMenu(raiz, 'Mover para…')!.click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-pasta-destino-dialog')).not.toBeNull();
      // Sem mudança de destino, "Mover" fica desabilitado.
      expect(botaoPorTexto(raiz, 'Mover')?.disabled).toBe(true);
    });
  });

  describe('setas de ordem do mestre', () => {
    it('na raiz, emite o movimento com o vizinho visível da raiz', () => {
      const { fixture, raiz, host } = montar({
        organizacao: organizacaoBase(true, TipoDocumentoOrganizacaoEnum.MESTRE),
      });
      host.documentos.set([carta, mapa, diario, relatorio, documento(5, 'Boletim')]);
      host.ordenavel.set(true);
      fixture.detectChanges();

      botaoPorRotulo(raiz, 'Descer Carta')!.click();

      expect(host.movimentos).toHaveLength(1);
      expect(host.movimentos[0]).toMatchObject({
        documento: { id: 1 },
        vizinho: { id: 5 },
        deslocamento: 1,
      });
    });

    it('dentro da pasta, a seta reposiciona pelo vínculo (posição no grupo)', () => {
      const { fixture, raiz, host, store } = montar({
        organizacao: organizacaoBase(true, TipoDocumentoOrganizacaoEnum.MESTRE),
      });
      host.ordenavel.set(true);
      (raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement).click();
      fixture.detectChanges();

      botaoPorRotulo(raiz, 'Descer Mapa')!.click();

      expect(store.moverDocumento).toHaveBeenCalledWith(2, 10, 1);
      expect(host.movimentos).toHaveLength(0);
    });

    it('a primeira e a última seta do grupo ficam desabilitadas', () => {
      const { fixture, raiz, host } = montar({
        organizacao: organizacaoBase(true, TipoDocumentoOrganizacaoEnum.MESTRE),
      });
      host.ordenavel.set(true);
      (raiz.querySelector('.pasta-linha__alternar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(botaoPorRotulo(raiz, 'Subir Mapa')!.disabled).toBe(true);
      expect(botaoPorRotulo(raiz, 'Descer Diário')!.disabled).toBe(true);
      expect(botaoPorRotulo(raiz, 'Descer Mapa')!.disabled).toBe(false);
    });
  });
});
