import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { ContencaoPreset } from '../styles/tema/contencao.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, errorHandlerInterceptor])),
    // Tema "Terminal de Contenção" (dark-first). Ver docs/design/DESIGN.md. A troca de accent
    // em runtime (presets + color picker) é escopo do M1; aqui fica o preset base do tema.
    providePrimeNG({ theme: { preset: ContencaoPreset, options: { darkModeSelector: '.dark' } } }),
    MessageService,
  ],
};
