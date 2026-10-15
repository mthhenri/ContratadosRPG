import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { Transcricoes } from './transcricao.page';
import { TranscricaoService } from './transcricao.service';
import { SessaoService } from '../../core/services/sessao.service';
const id = 'e809de1e-005c-4943-9c68-5ce3b445065e';
describe('Transcricoes — vínculo e fallback', () => {
  const api = { recuperarPedido: vi.fn(), confirmar: vi.fn(), listarDispositivos: vi.fn(), listarSessoes: vi.fn(), revogar: vi.fn() };
  beforeEach(() => { vi.resetAllMocks(); api.recuperarPedido.mockReturnValue(of({ identificador: id, nome: 'PC', codigo: '1234ABCD' })); api.listarDispositivos.mockReturnValue(of([])); });
  async function criar(params: Record<string,string>) {
    await TestBed.configureTestingModule({ imports: [Transcricoes], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } },
      { provide: TranscricaoService, useValue: api }, { provide: SessaoService, useValue: { usuario: signal({ login: 'mestre' }) } },
    ] }).compileComponents();
    const f = TestBed.createComponent(Transcricoes); f.detectChanges(); return f;
  }
  it('pedido não confirma automaticamente e exige código digitado', async () => {
    const f = await criar({ identificador: id }); const root = f.nativeElement as HTMLElement;
    const button = [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Vincular'))!;
    expect(button.disabled).toBe(true); expect(api.confirmar).not.toHaveBeenCalled();
    const input = root.querySelector('input')!; input.value = '1234abcd'; input.dispatchEvent(new Event('input')); f.detectChanges();
    api.confirmar.mockReturnValue(of({})); button.click(); f.detectChanges();
    expect(api.confirmar).toHaveBeenCalledWith(id, '1234ABCD'); expect(root.textContent).toContain('Volte ao aplicativo');
  });
  it('sem rede ao confirmar não culpa código, prazo ou permissão', async () => {
    const f = await criar({ identificador: id }); const root = f.nativeElement as HTMLElement;
    const input = root.querySelector('input')!; input.value = '1234abcd'; input.dispatchEvent(new Event('input')); f.detectChanges();
    api.confirmar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Vincular'))!.click(); f.detectChanges();
    expect(root.textContent).toContain('Sem conexão'); expect(root.textContent).not.toContain('Confira o código');
    api.confirmar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Vincular'))!.click(); f.detectChanges();
    expect(root.textContent).toContain('Confira o código');
  });
  it('pedido expirado mantém instruções de abertura manual', async () => {
    api.recuperarPedido.mockReturnValue(throwError(() => new Error('404')));
    const f = await criar({ identificador: id });
    expect(f.nativeElement.textContent).toContain('indisponível ou expirado');
    expect(f.nativeElement.textContent).toContain('Instalar ou abrir manualmente');
    expect(f.nativeElement.textContent).not.toContain('aplicativo não instalado');
  });
  it('revogação pendente impede clique duplicado e falha não remove dispositivo', async () => {
    api.listarDispositivos.mockReturnValue(of([{ identificador: id, nome: 'PC' }]));
    const response = new Subject(); api.revogar.mockReturnValue(response);
    const f = await criar({}); const root = f.nativeElement as HTMLElement;
    const button = [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Revogar'))!;
    button.click(); f.detectChanges(); expect(button.disabled).toBe(true);
    response.error(new Error('offline')); f.detectChanges();
    expect(root.textContent).toContain('Não foi possível revogar'); expect(root.textContent).toContain('PC');
  });
});
