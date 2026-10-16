import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlossarioTranscricao } from './glossario.page';
import { TranscricaoService } from './transcricao.service';
import { ConfirmacaoService } from '../../shared/ui/confirmacao/confirmacao.service';
import { formatarMilissegundos } from './glossario';

const termo = (id: number, texto: string) => ({ id, campanhaId: 9, termo: texto, createdDate: '', updatedDate: '' });

describe('formatarMilissegundos', () => {
  it('formata com sinal e milissegundos', () => {
    expect(formatarMilissegundos(0)).toBe('0:00,000');
    expect(formatarMilissegundos(-750)).toBe('-0:00,750');
    expect(formatarMilissegundos(61250)).toBe('1:01,250');
  });
});

describe('GlossarioTranscricao', () => {
  const api = { listarTermos: vi.fn(), listarIdentidades: vi.fn(), listarSessoes: vi.fn(), listarFaixas: vi.fn(),
    criarTermo: vi.fn(), alterarTermo: vi.fn(), excluirTermo: vi.fn() };
  const confirmacao = { confirmar: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.listarTermos.mockReturnValue(of([termo(1, 'Eldoria')]));
    api.listarIdentidades.mockReturnValue(of([{ id: 1, campanhaId: 9, nomeOrigem: 'joao', participante: 'João', createdDate: '', updatedDate: '' }]));
    api.listarSessoes.mockReturnValue(of([{ id: 5, titulo: 'Sessão 1' }]));
  });
  async function criar() {
    await TestBed.configureTestingModule({ imports: [GlossarioTranscricao], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ campanhaId: '9' }) } } },
      { provide: TranscricaoService, useValue: api }, { provide: ConfirmacaoService, useValue: confirmacao }] }).compileComponents();
    const f = TestBed.createComponent(GlossarioTranscricao); f.detectChanges(); return f;
  }
  const botao = (raiz: HTMLElement, texto: string) => [...raiz.querySelectorAll('button')].find(b => b.textContent?.includes(texto) || b.getAttribute('aria-label')?.includes(texto)) as HTMLButtonElement;
  function digitar(f: { detectChanges(): void }, campo: HTMLInputElement, valor: string) { campo.value = valor; campo.dispatchEvent(new Event('input')); f.detectChanges(); }

  it('lista termos e identidades; ações por item só aparecem no modo de edição', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Eldoria'); expect(raiz.textContent).toContain('joao');
    expect(botao(raiz, 'Editar Eldoria')).toBeUndefined();
    botao(raiz, 'Editar termos').click(); f.detectChanges();
    expect(botao(raiz, 'Editar Eldoria')).toBeDefined(); expect(botao(raiz, 'Excluir Eldoria')).toBeDefined();
  });

  it('adiciona termo, recarrega e avisa termo parecido sem bloquear', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    api.criarTermo.mockReturnValue(of({ ...termo(2, 'Eldória'), parecidoCom: 'Eldoria' }));
    digitar(f, raiz.querySelector('input')!, 'Eldória');
    botao(raiz, 'Adicionar').click(); f.detectChanges();
    expect(api.criarTermo).toHaveBeenCalledWith(9, 'Eldória');
    expect(raiz.textContent).toContain('só difere no acento');
    expect(api.listarTermos).toHaveBeenCalledTimes(2);
  });

  it('bloqueia termo inválido antes de enviar e explica o motivo', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    digitar(f, raiz.querySelector('input')!, 'a'.repeat(81));
    expect(botao(raiz, 'Adicionar').disabled).toBe(true); expect(raiz.textContent).toContain('passa de 80');
    digitar(f, raiz.querySelector('input')!, 'a​b');
    expect(raiz.textContent).toContain('caracteres invisíveis');
    expect(api.criarTermo).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de duplicidade devolvida pelo servidor (409)', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    api.criarTermo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { mensagem: 'Já existe o termo "Eldoria" neste glossário' } })));
    digitar(f, raiz.querySelector('input')!, 'ELDORIA'); botao(raiz, 'Adicionar').click(); f.detectChanges();
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('Já existe o termo');
  });

  it('sem rede não culpa o termo', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    api.criarTermo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    digitar(f, raiz.querySelector('input')!, 'Novo'); botao(raiz, 'Adicionar').click(); f.detectChanges();
    expect(raiz.textContent).toContain('Sem conexão');
  });

  it('edita o termo no próprio lugar e mantém o erro no campo', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    botao(raiz, 'Editar termos').click(); f.detectChanges(); botao(raiz, 'Editar Eldoria').click(); f.detectChanges();
    const campo = raiz.querySelectorAll('input')[1] as HTMLInputElement; expect(campo.value).toBe('Eldoria');
    api.alterarTermo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { mensagem: 'Já existe o termo "Vale" neste glossário' } })));
    digitar(f, campo, 'Vale'); botao(raiz, 'Salvar').click(); f.detectChanges();
    expect(api.alterarTermo).toHaveBeenCalledWith(1, 'Vale'); expect(raiz.textContent).toContain('Já existe o termo');
    api.alterarTermo.mockReturnValue(of({ ...termo(1, 'Vale'), parecidoCom: null }));
    botao(raiz, 'Salvar').click(); f.detectChanges();
    expect(raiz.textContent).toContain('Termo salvo.');
  });

  it('exclui só depois da confirmação', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    confirmacao.confirmar.mockImplementation(async (pedido: { aoConfirmar: () => Promise<void> }) => { await pedido.aoConfirmar(); return true; });
    api.excluirTermo.mockReturnValue(of(null));
    botao(raiz, 'Editar termos').click(); f.detectChanges(); botao(raiz, 'Excluir Eldoria').click(); f.detectChanges();
    await f.whenStable();
    expect(confirmacao.confirmar).toHaveBeenCalled(); expect(api.excluirTermo).toHaveBeenCalledWith(1);
  });

  it('mostra faixas de uma sessão somente para leitura', async () => {
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    api.listarFaixas.mockReturnValue(of([{ id: 1, identificador: 'x', sessaoId: 5, nomeArquivo: '1-joao.wav', participante: 'João', deslocamentoMilissegundos: -750, identidadeConfirmada: true, silencioInicialMilissegundos: 800, execucaoSelecionadaId: null, createdDate: '', updatedDate: '' }]));
    botao(raiz, 'Ver faixas').click(); f.detectChanges();
    expect(raiz.textContent).toContain('1-joao.wav'); expect(raiz.textContent).toContain('deslocamento -0:00,750');
    expect(raiz.textContent).toContain('Confirmada'); expect(raiz.textContent).toContain('(informativo)');
    botao(raiz, 'Ocultar faixas').click(); f.detectChanges();
    expect(raiz.textContent).not.toContain('1-joao.wav');
  });

  it('estado vazio do glossário orienta o Mestre', async () => {
    api.listarTermos.mockReturnValue(of([])); api.listarIdentidades.mockReturnValue(of([])); api.listarSessoes.mockReturnValue(of([]));
    const f = await criar(); const raiz = f.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Nenhum termo ainda.'); expect(raiz.textContent).toContain('Nenhuma identidade ainda.');
    expect(botao(raiz, 'Editar termos')).toBeUndefined();
  });
});
