import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { ContencaoPreset } from '../styles/tema/contencao.preset';
import { TemaService } from './core/services/tema.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, errorHandlerInterceptor])),
    // Tema "Terminal de Contenção" (dark-first). Ver docs/design/DESIGN.md. O preset base fica
    // aqui; a troca em runtime (presets + color picker + claro/escuro) é do `TemaService` (m1-13).
    providePrimeNG({ theme: { preset: ContencaoPreset, options: { darkModeSelector: '.dark' } } }),
    // Restaura e aplica a escolha de tema persistida antes da primeira renderização (sem flash).
    provideAppInitializer(() => inject(TemaService).iniciar()),
    // Em desenvolvimento, marca a aba do navegador com sufixo "- DEV" (produção mantém o
    // título do index.html). `environment.producao` é falso no build de dev.
    provideAppInitializer(() => {
      if (!environment.producao) {
        inject(Title).setTitle('Contratados RPG - DEV');
      }
    }),
    MessageService,
  ],
};
