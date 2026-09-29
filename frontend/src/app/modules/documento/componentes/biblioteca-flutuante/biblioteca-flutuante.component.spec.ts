import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { DocumentoService } from '../../documento.service';
import { RascunhoDocumentoRegistro } from '../../rascunho-documento.guard';
import { DocumentoCriarDialog } from '../documento-criar-dialog/documento-criar-dialog.component';
import { BibliotecaFlutuante } from './biblioteca-flutuante.component';

@Component({
  imports: [BibliotecaFlutuante],
  template: `<app-biblioteca-flutuante
    #biblioteca
    [campanhaId]="9"
    campanhaNome="Operação Maré"
    [ehMestre]="ehMestre()"
    [paginaRota]="paginaRota()"
  />`,
})
class Hospedeira {
  readonly ehMestre = signal(false);
  readonly paginaRota = signal<readonly (string | number)[] | null>(null);
  readonly biblioteca = viewChild.required<BibliotecaFlutuante>('biblioteca');
}

/**
 * Prova o painel flutuante da Biblioteca (m9-11): nada é pedido antes da primeira abertura, o
 * alternar abre/fecha (e fechar pausa a presença), o botão do cabeçalho leva à página, e as ações
 * por papel — o mestre vê o chip de estado, Revelar/Ocultar e Editar; o jogador, só o leitor. Da
 * m9-13: criar no painel (dialog da página, edição logo em seguida), salvar e o rascunho protegido
 * ao trocar, fechar e sair da tela; minimizar não descarta.
 */
describe('BibliotecaFlutuante', () => {
  const V1 = '2026-09-26 10:00:00.000001+00';
  const V2 = '2026-09-26 10:05:00.000002+00';
  const resumo = (id: number, titulo: string, revelado: boolean): DocumentoResumoDto => ({
    id,
    campanhaId: 9,
    titulo,
    tipo: TipoDocumentoEnum.TEXTO,
    imagemUrl: null,
    revelado,
    ordem: id,
    updatedDate: V1,
  });
  const lista = [resumo(1, 'Carta do informante', true), resumo(2, 'Diário do capitão', false)];

  function montar(ehMestre = false, documentos: readonly DocumentoResumoDto[] = lista) {
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      informarLeitura: vi.fn(),
      reconexao: signal(0),
      reconexao$: new Subject<void>().asObservable(),
      documentoAlterado$: new Subject<DocumentoBibliotecaAlteradaDto>(),
    };
    const documentoService = {
      listar: vi.fn(() => of([...documentos])),
      recuperar: vi.fn((id: number) =>
        of({ ...lista.find((item) => item.id === id)!, conteudoMarkdown: '# Texto', createdDate: V1 }),
      ),
      buscar: vi.fn(),
      revelar: vi.fn(),
      ocultar: vi.fn(),
      criar: vi.fn(),
      alterar: vi.fn(),
      enviarImagem: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DocumentoService, useValue: documentoService },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
    const confirmar = vi
      .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
      .mockResolvedValue(true);
    const fixture = TestBed.createComponent(Hospedeira);
    fixture.componentInstance.ehMestre.set(ehMestre);
    fixture.detectChanges();
    const biblioteca = fixture.componentInstance.biblioteca();
    const raiz = fixture.nativeElement as HTMLElement;
    const abrirDocumento = (titulo: string) => {
      Array.from(raiz.querySelectorAll<HTMLButtonElement>('.documento-cartao'))
        .find((cartao) => cartao.textContent?.includes(titulo))!
        .click();
      fixture.detectChanges();
    };
    return { fixture, biblioteca, raiz, tempoReal, documentoService, abrirDocumento, confirmar };
  }

  const rotulos = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll('button')).map((botao) =>
      (botao.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  afterEach(() => localStorage.clear());

  it('não pede nada ao backend nem entra na sala antes da primeira abertura', () => {
    const { raiz, documentoService, tempoReal } = montar();

    expect(documentoService.listar).not.toHaveBeenCalled();
    expect(tempoReal.entrarSalaCampanha).not.toHaveBeenCalled();
    expect(raiz.querySelector('[role="dialog"]')).toBeNull();
  });

  it('alternar abre (iniciando a store uma vez só) e fecha, pausando a presença', () => {
    const { fixture, biblioteca, raiz, documentoService, tempoReal, abrirDocumento } = montar();

    biblioteca.alternar();
    fixture.detectChanges();
    expect(biblioteca.aberto()).toBe(true);
    expect(raiz.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Biblioteca · Operação Maré',
    );
    expect(documentoService.listar).toHaveBeenCalledTimes(1);
    abrirDocumento('Carta do informante');
    tempoReal.informarLeitura.mockClear();

    biblioteca.alternar();
    fixture.detectChanges();
    expect(biblioteca.aberto()).toBe(false);
    expect(tempoReal.informarLeitura).toHaveBeenLastCalledWith(9, null);

    biblioteca.alternar();
    fixture.detectChanges();
    expect(documentoService.listar).toHaveBeenCalledTimes(1);
    expect(tempoReal.informarLeitura).toHaveBeenLastCalledWith(9, 1);
    expect(raiz.querySelector('.biblioteca__documento-titulo')?.textContent).toContain(
      'Carta do informante',
    );
  });

  it('o botão "Abrir página da Biblioteca" navega para a página da campanha', () => {
    const { fixture, biblioteca, raiz } = montar();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    biblioteca.abrir();
    fixture.detectChanges();

    raiz.querySelector<HTMLButtonElement>('[aria-label="Abrir página da Biblioteca"]')!.click();

    expect(navegar).toHaveBeenCalledWith(['/campanhas', 9, 'documentos']);
  });

  it('com `paginaRota` (espectador, m9-12), o botão leva à página dele', () => {
    const { fixture, biblioteca, raiz } = montar();
    fixture.componentInstance.paginaRota.set(['/campanhas', 9, 'espectador', 'documentos']);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    biblioteca.abrir();
    fixture.detectChanges();

    raiz.querySelector<HTMLButtonElement>('[aria-label="Abrir página da Biblioteca"]')!.click();

    expect(navegar).toHaveBeenCalledWith(['/campanhas', 9, 'espectador', 'documentos']);
  });

  it('jogador: só o leitor — sem chip de estado nem Revelar/Ocultar/Editar/Remover', () => {
    const { fixture, biblioteca, raiz, abrirDocumento } = montar(false);
    biblioteca.abrir();
    fixture.detectChanges();
    abrirDocumento('Carta do informante');

    expect(raiz.querySelector('app-leitor-documento')).not.toBeNull();
    expect(raiz.querySelector('app-chip')).toBeNull();
    for (const rotulo of ['Revelar', 'Ocultar', 'Editar', 'Remover', 'Novo documento']) {
      expect(rotulos(raiz)).not.toContain(rotulo);
    }
  });

  it('mestre: chip de estado, Revelar/Ocultar, Editar e Novo documento — sem Remover nem setas', async () => {
    const { fixture, biblioteca, raiz, abrirDocumento } = montar(true);
    biblioteca.abrir();
    fixture.detectChanges();

    expect(raiz.querySelectorAll('.documento-cartao app-chip').length).toBe(2);
    abrirDocumento('Diário do capitão');
    await estabilizar(fixture);

    const botoes = rotulos(raiz);
    for (const rotulo of ['Revelar', 'Editar', 'Novo documento']) {
      expect(botoes).toContain(rotulo);
    }
    expect(botoes).not.toContain('Remover');
    expect(raiz.querySelector('[aria-label^="Subir"], [aria-label^="Descer"]')).toBeNull();
    expect(raiz.querySelector('input[type="file"]')).toBeNull();
    expect(raiz.querySelector('app-leitor-documento')).not.toBeNull();
  });

  // ── Criar e editar no painel (m9-13) ─────────────────────────────────────

  async function estabilizar(fixture: ReturnType<typeof montar>['fixture']): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const botao = (raiz: HTMLElement, rotulo: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim() === rotulo,
    );

  function dialog(fixture: ReturnType<typeof montar>['fixture']): DocumentoCriarDialog | null {
    const encontrado = fixture.debugElement.query(By.directive(DocumentoCriarDialog));
    return encontrado?.componentInstance ?? null;
  }

  function editor(fixture: ReturnType<typeof montar>['fixture']): EditorMarkdown {
    return fixture.debugElement.query(By.directive(EditorMarkdown)).componentInstance;
  }

  async function editarCarta(contexto: ReturnType<typeof montar>, rascunho: string) {
    contexto.biblioteca.abrir();
    contexto.fixture.detectChanges();
    contexto.abrirDocumento('Carta do informante');
    await estabilizar(contexto.fixture);
    botao(contexto.raiz, 'Editar')!.click();
    await estabilizar(contexto.fixture);
    vi.spyOn(editor(contexto.fixture), 'confirmarValor').mockReturnValue(rascunho);
  }

  it('mestre, lista vazia: "Novo documento" abre o dialog, e cancelar não cria nada', async () => {
    const { fixture, biblioteca, raiz, documentoService } = montar(true, []);
    biblioteca.abrir();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Nenhum documento ainda.');

    botao(raiz, 'Novo documento')!.click();
    await estabilizar(fixture);
    expect(dialog(fixture)).not.toBeNull();

    dialog(fixture)!.fechou.emit();
    await estabilizar(fixture);
    expect(dialog(fixture)).toBeNull();
    expect(documentoService.criar).not.toHaveBeenCalled();
    expect(biblioteca.aberto()).toBe(true);
  });

  it('um TEXTO criado abre em edição no painel e salvar grava o conteúdo da versão criada', async () => {
    const { fixture, biblioteca, raiz, documentoService } = montar(true);
    biblioteca.abrir();
    fixture.detectChanges();
    botao(raiz, 'Novo documento')!.click();
    await estabilizar(fixture);

    const novo = { ...resumo(4, 'Relatório', false), conteudoMarkdown: '', createdDate: V1 };
    dialog(fixture)!.criado.emit(novo);
    await estabilizar(fixture);
    expect(dialog(fixture)).toBeNull();
    expect(raiz.querySelector('.documento-cartao--aberto')?.textContent).toContain('Relatório');
    expect(raiz.querySelector('app-editor-markdown.biblioteca__editor')).not.toBeNull();

    vi.spyOn(editor(fixture), 'confirmarValor').mockReturnValue('# Relatório da missão');
    documentoService.alterar.mockReturnValue(
      of({ ...novo, conteudoMarkdown: '# Relatório da missão', updatedDate: V2 }),
    );
    botao(raiz, 'Salvar')!.click();
    await estabilizar(fixture);

    expect(documentoService.alterar).toHaveBeenCalledWith({
      id: 4,
      titulo: 'Relatório',
      conteudoMarkdown: '# Relatório da missão',
      updatedDate: V1,
    });
    expect(raiz.querySelector('app-editor-markdown.biblioteca__editor')).toBeNull();
    expect(raiz.querySelector('app-leitor-documento')).not.toBeNull();
    expect(biblioteca.aberto()).toBe(true);
  });

  it('um IMAGEM criado pede o arquivo no próprio painel', async () => {
    const { fixture, biblioteca, raiz } = montar(true);
    biblioteca.abrir();
    fixture.detectChanges();
    botao(raiz, 'Novo documento')!.click();
    await estabilizar(fixture);

    dialog(fixture)!.criado.emit({
      ...resumo(4, 'Planta', false),
      tipo: TipoDocumentoEnum.IMAGEM,
      conteudoMarkdown: null,
      createdDate: V1,
    });
    await estabilizar(fixture);

    expect(botao(raiz, 'Escolher imagem')).toBeTruthy();
    expect(raiz.querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
      'image/jpeg,image/png,image/webp',
    );
  });

  it('rascunho: trocar de documento e fechar o painel perguntam; recusado, a edição fica', async () => {
    const contexto = montar(true);
    await editarCarta(contexto, 'rascunho');
    contexto.confirmar.mockResolvedValue(false);

    contexto.abrirDocumento('Diário do capitão');
    await estabilizar(contexto.fixture);
    expect(contexto.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Descartar alterações?' }),
    );
    expect(contexto.raiz.querySelector('app-editor-markdown.biblioteca__editor')).not.toBeNull();

    contexto.biblioteca.alternar();
    await estabilizar(contexto.fixture);
    expect(contexto.biblioteca.aberto()).toBe(true);
    expect(contexto.raiz.querySelector('app-editor-markdown.biblioteca__editor')).not.toBeNull();

    contexto.confirmar.mockResolvedValue(true);
    contexto.biblioteca.alternar();
    await estabilizar(contexto.fixture);
    expect(contexto.biblioteca.aberto()).toBe(false);
  });

  it('minimizar não descarta a edição', async () => {
    const contexto = montar(true);
    await editarCarta(contexto, 'rascunho');

    contexto.raiz.querySelector<HTMLButtonElement>('[aria-label^="Minimizar"]')!.click();
    await estabilizar(contexto.fixture);
    contexto.biblioteca.alternar();
    await estabilizar(contexto.fixture);

    expect(contexto.confirmar).not.toHaveBeenCalled();
    expect(contexto.biblioteca.aberto()).toBe(true);
    expect(contexto.raiz.querySelector('app-editor-markdown.biblioteca__editor')).not.toBeNull();
  });

  it('sair da tela: o registro da guarda pergunta pelo rascunho do painel', async () => {
    const contexto = montar(true);
    const registro = TestBed.inject(RascunhoDocumentoRegistro);
    await expect(registro.podeSair()).resolves.toBe(true);

    await editarCarta(contexto, 'rascunho');
    contexto.confirmar.mockResolvedValue(false);
    await expect(registro.podeSair()).resolves.toBe(false);

    contexto.fixture.destroy();
    await expect(registro.podeSair()).resolves.toBe(true);
  });
});
