import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { LoadingService } from '../services/loading.service';

/**
 * Marca cada requisição HTTP como em andamento no `LoadingService` e a libera quando ela
 * termina (sucesso ou erro), permitindo ao shell exibir um indicador de carregamento
 * global. Registrado em `app.config.ts` via `withInterceptors`.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingService = inject(LoadingService);
  loadingService.start();
  return next(request).pipe(finalize(() => loadingService.finish()));
};
