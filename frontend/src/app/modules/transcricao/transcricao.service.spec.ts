import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { TranscricaoService } from './transcricao.service';
import { errorHandlerInterceptor } from '../../core/interceptors/error-handler.interceptor';
import { SessaoService } from '../../core/services/sessao.service';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';

describe('TranscricaoService — falha offline tratada na tela', () => {
  it('não mostra toast com URL interna ao perder conexão', () => {
    const notificar = vi.fn(); const tratar = vi.fn();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([errorHandlerInterceptor])), provideHttpClientTesting(),
      { provide: SessaoService, useValue: { autenticado: () => true } },
      { provide: NotificacaoService, useValue: { notificar } },
    ] });
    TestBed.inject(TranscricaoService).criarIntencao(1).subscribe({ error: tratar });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/transcricao/sessao/1/abertura').error(new ProgressEvent('error'), { status: 0 });
    expect(tratar).toHaveBeenCalled(); expect(notificar).not.toHaveBeenCalled(); http.verify();
  });
});
