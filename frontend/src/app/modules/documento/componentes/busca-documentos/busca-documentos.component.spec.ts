import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoBuscaResultadoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { DocumentoService } from '../../documento.service';
import { BuscaDocumentos } from './busca-documentos.component';

@Component({
  imports: [BuscaDocumentos],
  template: `
    <app-busca-documentos
      [campanhaId]="9"
      [mostrarEstado]="mostrarEstado()"
      (selecionar)="selecionados.push($event)"
      (ativaChange)="ativa = $event"
      (totalChange)="total = $event"
    />
  `,
})
class Hospedeiro {
  readonly mostrarEstado = signal(false);
  readonly selecionados: number[] = [];
  ativa = false;
  total: number | null = null;
}

/**
 * Prova a busca da biblioteca (m9-05): estados (ocioso, buscando, sem resultado, erro, com
 * resultado), o destaque do trecho sem `innerHTML`, "Carregar mais", o chip só para o mestre e o
 * refazer em silêncio a cada `documento:alterado`.
 */
describe('BuscaDocumentos', () => {
  const resultado = (
    id: number,
    extra: Partial<DocumentoBuscaResultadoDto> = {},
  ): DocumentoBuscaResultadoDto => ({
    id,
    titulo: `Documento ${id}`,
    tipo: TipoDocumentoEnum.TEXTO,
    trecho: 'o ⟦galpão⟧ do porto',
    revelado: true,
    updatedDate: '2026-09-26T10:00:00.000Z',
    relevancia: 0.5,
    ...extra,
  });
  const pagina = (
    itens: DocumentoBuscaResultadoDto[],
    paginaAtual = 1,
    totalPaginas = 1,
    totalItens = itens.length,
  ): PaginatedResult<DocumentoBuscaResultadoDto> => ({
    itens,
    paginaAtual,
    totalPaginas,
    totalItens,
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function montar(buscar = vi.fn(() => of(pagina([resultado(1)])))) {
    const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
    const reconexao = signal(0);
    const reconexao$ = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        { provide: DocumentoService, useValue: { buscar } },
        {
          provide: TempoRealService,
          useValue: { documentoAlterado$, reconexao, reconexao$: reconexao$.asObservable() },
        },
      ],
    });
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const digitar = (termo: string) => {
      const campo = raiz.querySelector<HTMLInputElement>('input.campo__controle')!;
      campo.value = termo;
      campo.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
    };
    return { fixture, raiz, buscar, digitar, documentoAlterado$, reconexao, reconexao$ };
  }

  const texto = (elemento: Element | null | undefined) =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('ociosa sem termo: só o campo com o ícone de busca, sem consulta', () => {
    const { fixture, raiz, buscar } = montar();

    expect(raiz.querySelector('app-campo .campo__icone')).not.toBeNull();
    expect(raiz.querySelector('.busca-documentos__resultados')).toBeNull();
    expect(fixture.componentInstance.ativa).toBe(false);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('com termo, busca depois do debounce e segmenta o destaque em <mark> como texto', () => {
    const { fixture, raiz, buscar, digitar } = montar();

    digitar('  galpão ');

    expect(buscar).toHaveBeenCalledWith({ campanhaId: 9, termo: 'galpão', pagina: 1, limite: 20 });
    expect(fixture.componentInstance.ativa).toBe(true);
    expect(fixture.componentInstance.total).toBe(1);
    const marcas = raiz.querySelectorAll('.busca-documentos__trecho mark');
    expect(marcas).toHaveLength(1);
    expect(texto(marcas[0])).toBe('galpão');
    expect(texto(raiz.querySelector('.busca-documentos__trecho'))).toBe('o galpão do porto');
  });

  it('nunca interpreta o trecho como HTML', () => {
    const { raiz, digitar } = montar(
      vi.fn(() => of(pagina([resultado(1, { trecho: '<img src=x onerror=alert(1)> ⟦<b>x</b>⟧' })]))),
    );

    digitar('x');

    const trecho = raiz.querySelector('.busca-documentos__trecho')!;
    expect(trecho.querySelector('img, b')).toBeNull();
    expect(texto(trecho)).toBe('<img src=x onerror=alert(1)> <b>x</b>');
  });

  it('mostra o esqueleto enquanto busca', () => {
    const pendente = new Subject<PaginatedResult<DocumentoBuscaResultadoDto>>();
    const { raiz, digitar } = montar(vi.fn(() => pendente));

    digitar('porto');

    expect(raiz.querySelector('[aria-label="Buscando os documentos"]')).not.toBeNull();
  });

  it('sem resultado, o estado vazio cita o termo', () => {
    const { raiz, digitar } = montar(vi.fn(() => of(pagina([]))));

    digitar('dragão');

    expect(texto(raiz.querySelector('app-estado-vazio'))).toContain('Nada encontrado.');
    expect(texto(raiz.querySelector('app-estado-vazio'))).toContain('“dragão”');
  });

  it('com erro, avisa e "Tentar de novo" refaz a consulta', () => {
    const buscar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('500')))
      .mockReturnValue(of(pagina([resultado(1)])));
    const { fixture, raiz, digitar } = montar(buscar);

    digitar('porto');
    expect(texto(raiz)).toContain('Não foi possível buscar agora.');

    Array.from(raiz.querySelectorAll('button'))
      .find((botao) => texto(botao) === 'Tentar de novo')!
      .click();
    fixture.detectChanges();

    expect(buscar).toHaveBeenCalledTimes(2);
    expect(raiz.querySelectorAll('.documento-cartao')).toHaveLength(1);
  });

  it('"Carregar mais" traz a página seguinte e acrescenta, sumindo na última', () => {
    const buscar = vi
      .fn()
      .mockReturnValueOnce(of(pagina([resultado(1), resultado(2)], 1, 2, 3)))
      .mockReturnValueOnce(of(pagina([resultado(3)], 2, 2, 3)));
    const { fixture, raiz, digitar } = montar(buscar);

    digitar('porto');
    const mais = raiz.querySelector<HTMLButtonElement>('.busca-documentos__mais')!;
    expect(texto(mais)).toBe('Carregar mais');
    mais.click();
    fixture.detectChanges();

    expect(buscar).toHaveBeenLastCalledWith({ campanhaId: 9, termo: 'porto', pagina: 2, limite: 20 });
    expect(raiz.querySelectorAll('.documento-cartao')).toHaveLength(3);
    expect(raiz.querySelector('.busca-documentos__mais')).toBeNull();
  });

  it('o chip Revelado/Oculto só aparece com `mostrarEstado` (o mestre)', () => {
    const { fixture, raiz, digitar } = montar(
      vi.fn(() => of(pagina([resultado(1), resultado(2, { revelado: false })]))),
    );

    digitar('porto');
    expect(raiz.querySelector('.documento-cartao app-chip')).toBeNull();

    fixture.componentInstance.mostrarEstado.set(true);
    fixture.detectChanges();
    const chips = Array.from(raiz.querySelectorAll('.documento-cartao app-chip')).map(texto);
    expect(chips).toEqual(['Revelado', 'Oculto']);
  });

  it('clicar num resultado pede para abrir o documento', () => {
    const { fixture, raiz, digitar } = montar();

    digitar('porto');
    raiz.querySelector<HTMLButtonElement>('.documento-cartao')!.click();

    expect(fixture.componentInstance.selecionados).toEqual([1]);
  });

  it('apagar o termo sai da busca na hora', () => {
    const { fixture, raiz, digitar } = montar();

    digitar('porto');
    digitar('');

    expect(fixture.componentInstance.ativa).toBe(false);
    expect(raiz.querySelector('.busca-documentos__resultados')).toBeNull();
  });

  it('um documento:alterado da campanha refaz a busca ativa em silêncio; de outra campanha, não', () => {
    const pendente = new Subject<PaginatedResult<DocumentoBuscaResultadoDto>>();
    const buscar = vi
      .fn()
      .mockReturnValueOnce(of(pagina([resultado(1), resultado(2)])))
      .mockReturnValue(pendente);
    const { fixture, raiz, digitar, documentoAlterado$ } = montar(buscar);
    digitar('porto');

    documentoAlterado$.next({
      campanhaId: 10,
      documentoId: 2,
      alteracao: DocumentoAlteracaoEnum.OCULTADO,
    });
    expect(buscar).toHaveBeenCalledTimes(1);

    documentoAlterado$.next({
      campanhaId: 9,
      documentoId: 2,
      alteracao: DocumentoAlteracaoEnum.OCULTADO,
    });
    fixture.detectChanges();
    expect(buscar).toHaveBeenCalledTimes(2);
    // Sem esqueleto: os resultados atuais ficam até a resposta chegar.
    expect(raiz.querySelector('[aria-label="Buscando os documentos"]')).toBeNull();
    expect(raiz.querySelectorAll('.documento-cartao')).toHaveLength(2);

    pendente.next(pagina([resultado(1)]));
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.documento-cartao')).toHaveLength(1);
  });

  it('reconexao$ (reconexão real) refaz a busca ativa em silêncio (P-083)', () => {
    const { digitar, buscar, reconexao$ } = montar();
    digitar('porto');
    buscar.mockClear();

    reconexao$.next();

    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('reconexao$ sem termo não dispara busca', () => {
    const { buscar, reconexao$ } = montar();

    reconexao$.next();

    expect(buscar).not.toHaveBeenCalled();
  });

  it('sem termo, eventos não disparam busca', () => {
    const { buscar, documentoAlterado$ } = montar();

    documentoAlterado$.next({
      campanhaId: 9,
      documentoId: 1,
      alteracao: DocumentoAlteracaoEnum.REVELADO,
    });

    expect(buscar).not.toHaveBeenCalled();
  });
});
