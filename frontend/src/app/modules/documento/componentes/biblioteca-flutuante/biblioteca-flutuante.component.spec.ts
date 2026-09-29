import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { DocumentoService } from '../../documento.service';
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
 * por papel — o mestre vê o chip de estado e só Revelar/Ocultar; o jogador, só o leitor.
 */
describe('BibliotecaFlutuante', () => {
  const V1 = '2026-09-26 10:00:00.000001+00';
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

  function montar(ehMestre = false) {
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
      listar: vi.fn(() => of([...lista])),
      recuperar: vi.fn((id: number) =>
        of({ ...lista.find((item) => item.id === id)!, conteudoMarkdown: '# Texto', createdDate: V1 }),
      ),
      buscar: vi.fn(),
      revelar: vi.fn(),
      ocultar: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DocumentoService, useValue: documentoService },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
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
    return { fixture, biblioteca, raiz, tempoReal, documentoService, abrirDocumento };
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

  it('mestre: chip de estado e só Revelar/Ocultar — sem Editar, Remover, Novo documento nem setas', () => {
    const { fixture, biblioteca, raiz, abrirDocumento } = montar(true);
    biblioteca.abrir();
    fixture.detectChanges();

    expect(raiz.querySelectorAll('.documento-cartao app-chip').length).toBe(2);
    abrirDocumento('Diário do capitão');

    const botoes = rotulos(raiz);
    expect(botoes).toContain('Revelar');
    for (const rotulo of ['Editar', 'Remover', 'Novo documento']) {
      expect(botoes).not.toContain(rotulo);
    }
    expect(raiz.querySelector('[aria-label^="Subir"], [aria-label^="Descer"]')).toBeNull();
    expect(raiz.querySelector('input[type="file"]')).toBeNull();
    expect(raiz.querySelector('app-leitor-documento')).not.toBeNull();
  });
});
