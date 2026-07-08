import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { ContencaoPreset } from '../styles/tema/contencao.preset';
import { TemaService } from './core/services/tema.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: liga `data`/`params`/`query` da rota a `input()`s de mesmo nome
    // do componente — usado para passar o modo (`comprar`/`vender`) à `ComprasPage` por rota (m1-20).
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([loadingInterceptor, authTokenInterceptor, errorHandlerInterceptor]),
    ),
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
