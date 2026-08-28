import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  AcessoNegadoPage,
  FRAGMENTOS_MENSAGEM_EXPURGADOS,
  MENSAGENS_ACESSO_NEGADO,
  MOLDES_REGISTRO_EXPURGADO,
  expurgarTexto,
} from './acesso-negado.page';

describe('AcessoNegadoPage', () => {
  let fixture: ComponentFixture<AcessoNegadoPage>;
  let raiz: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcessoNegadoPage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AcessoNegadoPage);
    raiz = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('usa a marca institucional, censura textual e retorno evidente', () => {
    expect(raiz.querySelector('app-marca')).not.toBeNull();
    expect(raiz.textContent).toContain('████');
    expect(raiz.textContent).toContain('DADOS EXPURGADOS');
    expect(raiz.textContent).toContain('REDACTED');
    expect(raiz.querySelector<HTMLAnchorElement>('a[href="/campanhas"]')?.textContent)
      .toContain('Retornar ao painel');
  });

  it('seleciona uma das mensagens e a mantém estável durante a instância', () => {
    const textoInicial = raiz.textContent ?? '';
    const encontrada = MENSAGENS_ACESSO_NEGADO.find((mensagem) => textoInicial.includes(mensagem));

    expect(MENSAGENS_ACESSO_NEGADO).toHaveLength(32);
    expect(MENSAGENS_ACESSO_NEGADO.every((mensagem) => mensagem.length >= 100)).toBe(true);
    expect(encontrada).toBeDefined();
    expect(raiz.querySelector('.acesso-negado__mensagem')?.textContent).toContain('█');
    expect(FRAGMENTOS_MENSAGEM_EXPURGADOS).toHaveLength(8);
    fixture.detectChanges();
    expect(raiz.textContent).toContain(encontrada!);
  });

  it('expurga todas as letras e preserva o ritmo do molde documental', () => {
    expect(expurgarTexto('Lorem ipsum, dolor sit amet.')).toBe('█████ █████, █████ ███ ████.');
    expect(expurgarTexto('ÁREA 4-B')).toBe('████ 4-█');
    expect(MOLDES_REGISTRO_EXPURGADO.length).toBeGreaterThanOrEqual(8);
  });

  it('renderiza um registro variável sem expor o Lorem Ipsum', () => {
    const registro = raiz.querySelector('.acesso-negado__censura')?.textContent?.trim() ?? '';

    expect(registro).toMatch(/^([█\s.,;:!?—-])+$/u);
    expect(registro).toContain(' ');
    expect(registro.length).toBeGreaterThan(100);
    expect(registro.toLowerCase()).not.toContain('lorem');

    fixture.detectChanges();
    expect(raiz.querySelector('.acesso-negado__censura')?.textContent?.trim()).toBe(registro);
  });
});
