import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { TemaService } from '../../core/services/tema.service';
import { LeitorDocumentosService } from '../leitor-documentos/leitor-documentos.service';
import { Layout } from './layout.component';

@Component({ selector: 'app-rota-layout-teste-a', template: '<p>Conteudo A</p>' })
class RotaLayoutTesteA {}

@Component({ selector: 'app-rota-layout-teste-b', template: '<p>Conteudo B</p>' })
class RotaLayoutTesteB {}

describe('Layout — leitor global de documentos', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  async function montar(autenticado: boolean) {
    localStorage.clear();
    if (autenticado) {
      localStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({ token: 'token', id: 1, login: 'agente', nome: 'Agente Teste' }),
      );
    }

    TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'conteudo-a', component: RotaLayoutTesteA },
          { path: 'conteudo-b', component: RotaLayoutTesteB },
        ]),
        MessageService,
      ],
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();
    await fixture.whenStable();

    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      leitorService: TestBed.inject(LeitorDocumentosService),
    };
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it.each([
    ['anônimo', false],
    ['autenticado', true],
  ])('exibe um único botão Documentos para usuário %s', async (_cenario, autenticado) => {
    const { raiz } = await montar(autenticado);
    const botoes = raiz.querySelectorAll<HTMLButtonElement>('nav .topbar__item[type="button"]');

    expect(botoes).toHaveLength(1);
    expect(botoes[0].textContent).toContain('Documentos');
    expect(botoes[0].getAttribute('aria-label')).toBe('Abrir documentos');
    expect(botoes[0].hasAttribute('routerLink')).toBe(false);
    expect(botoes[0].querySelector('app-icone svg')).not.toBeNull();
  });

  it('abre o leitor sem fechar o perfil nem alterar o tema do usuário', async () => {
    const { fixture, raiz, leitorService } = await montar(true);
    const temaService = TestBed.inject(TemaService);
    temaService.selecionarPreset('azul');
    const temaAnterior = {
      base: temaService.base(),
      preset: temaService.presetId(),
      accent: temaService.accentEfetivo(),
    };

    raiz.querySelector<HTMLButtonElement>('.topbar__perfil-gatilho')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__perfil-menu')).not.toBeNull();

    raiz.querySelector<HTMLButtonElement>('nav .topbar__item[type="button"]')!.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(leitorService.estado().aberto).toBe(true));
    fixture.detectChanges();

    expect(raiz.querySelector('.topbar__perfil-menu')).not.toBeNull();
    expect({
      base: temaService.base(),
      preset: temaService.presetId(),
      accent: temaService.accentEfetivo(),
    }).toEqual(temaAnterior);
  });

  it('não instancia o leitor antes do primeiro acesso a Documentos', async () => {
    const { raiz } = await montar(false);

    expect(raiz.querySelector('app-leitor-documentos')).toBeNull();
  });

  it('instancia o leitor como irmão imediatamente depois de .conteudo no primeiro acesso', async () => {
    const { fixture, raiz, leitorService } = await montar(false);
    raiz.querySelector<HTMLButtonElement>('nav .topbar__item[type="button"]')!.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(leitorService.estado().aberto).toBe(true));
    fixture.detectChanges();

    const conteudo = raiz.querySelector('main.conteudo');
    const leitor = raiz.querySelector('app-leitor-documentos');

    expect(conteudo).not.toBeNull();
    expect(leitor).not.toBeNull();
    expect(conteudo!.contains(leitor)).toBe(false);
    expect(conteudo!.nextElementSibling).toBe(leitor);
  });

  it('preserva a instância carregada depois de fechar e trocar o conteúdo do RouterOutlet', async () => {
    const { fixture, raiz, leitorService } = await montar(false);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/conteudo-a');
    fixture.detectChanges();
    expect(raiz.querySelector('app-leitor-documentos')).toBeNull();

    raiz.querySelector<HTMLButtonElement>('nav .topbar__item[type="button"]')!.click();
    fixture.detectChanges();
    await vi.waitFor(() => expect(leitorService.estado().aberto).toBe(true));
    fixture.detectChanges();
    const leitorAntes = raiz.querySelector('app-leitor-documentos');
    expect(leitorAntes).not.toBeNull();
    expect(raiz.querySelector('.conteudo')?.textContent).toContain('Conteudo A');

    leitorService.fechar();
    fixture.detectChanges();
    await router.navigateByUrl('/conteudo-b');
    fixture.detectChanges();

    expect(raiz.querySelector('.conteudo')?.textContent).toContain('Conteudo B');
    expect(raiz.querySelector('app-leitor-documentos')).toBe(leitorAntes);
    expect(leitorService.estado().aberto).toBe(false);
  });
});
