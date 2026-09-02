import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { TemaService } from '../../core/services/tema.service';
import { TopbarContextoService } from '../../core/services/topbar-contexto.service';
import { LeitorDocumentosService } from '../leitor-documentos/leitor-documentos.service';
import { Layout } from './layout.component';

@Component({ selector: 'app-rota-layout-teste-a', template: '<p>Conteudo A</p>' })
class RotaLayoutTesteA {}

@Component({ selector: 'app-rota-layout-teste-b', template: '<p>Conteudo B</p>' })
class RotaLayoutTesteB {}

describe('Layout — leitor global de documentos', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  async function montar(autenticado: boolean, tipo = TipoUsuarioEnum.NORMAL) {
    localStorage.clear();
    if (autenticado) {
      localStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({ token: 'token', id: 1, login: 'agente', nome: 'Agente Teste', tipo }),
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
          { path: 'acesso-negado', component: RotaLayoutTesteB },
        ]),
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

  it('mostra Admin com destino direto somente para administrador', async () => {
    const { raiz } = await montar(true, TipoUsuarioEnum.ADMIN);
    const link = raiz.querySelector<HTMLAnchorElement>('.topbar__item--admin');
    expect(link?.textContent).toContain('Admin');
    expect(link?.getAttribute('href')).toBe('/admin/usuarios');
  });

  it('não renderiza a topbar na rota isolada de acesso negado', async () => {
    const { fixture, raiz } = await montar(true, TipoUsuarioEnum.ADMIN);
    await TestBed.inject(Router).navigateByUrl('/acesso-negado');
    fixture.detectChanges();

    expect(raiz.querySelector('.topbar')).toBeNull();
    expect(raiz.querySelector('.conteudo--isolado')).not.toBeNull();
  });

  it.each([TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER])('oculta Admin para %s', async (tipo) => {
    const { raiz } = await montar(true, tipo);
    expect(raiz.querySelector('.topbar__item--admin')).toBeNull();
  });

  it('mostra Campanhas e Fichas com ícones distintos, sem duplicata no perfil', async () => {
    const { fixture, raiz } = await montar(true);
    const campanhas = raiz.querySelector<HTMLAnchorElement>('nav a[href="/campanhas"]');
    const fichas = raiz.querySelector<HTMLAnchorElement>('nav a[href="/fichas"]');

    expect(campanhas?.textContent).toContain('Campanhas');
    expect(campanhas?.querySelector('app-icone')?.getAttribute('nome')).toBe('campanhas');
    expect(fichas?.querySelector('app-icone')?.getAttribute('nome')).toBe('ficha');

    raiz.querySelector<HTMLButtonElement>('.topbar__perfil-gatilho')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__perfil-menu a[href="/campanhas"]')).toBeNull();
  });

  it('mostra selo no gatilho para administrador e tester, mas não para normal', async () => {
    const admin = await montar(true, TipoUsuarioEnum.ADMIN);
    expect(admin.raiz.querySelector('.topbar__tipo--admin')).not.toBeNull();

    TestBed.resetTestingModule();
    const tester = await montar(true, TipoUsuarioEnum.TESTER);
    expect(tester.raiz.querySelector('.topbar__tipo--tester')).not.toBeNull();

    TestBed.resetTestingModule();
    const normal = await montar(true, TipoUsuarioEnum.NORMAL);
    expect(normal.raiz.querySelector('.topbar__tipo--normal')).not.toBeNull();
    expect(normal.raiz.querySelector('.topbar__avatar')).toBeNull();
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

/**
 * Prova o chrome da topbar (ui-21): slot de contexto vazio/preenchido, selo de tempo real montado
 * uma única vez na barra (a lógica de silêncio/aviso é do `IndicadorTempoReal`, provada à parte),
 * e `Escape` fechando o dropdown de perfil com o foco devolvido ao gatilho.
 */
describe('Layout — chrome da topbar (ui-21)', () => {
  const CHAVE_SESSAO = 'contratados-rpg.sessao';

  async function montar(autenticado: boolean) {
    localStorage.clear();
    if (autenticado) {
      localStorage.setItem(
        CHAVE_SESSAO,
        JSON.stringify({
          token: 'token',
          id: 1,
          login: 'agente',
          nome: 'Agente Teste',
          tipo: TipoUsuarioEnum.NORMAL,
        }),
      );
    }

    TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    await TestBed.compileComponents();

    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();
    await fixture.whenStable();

    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      topbarContexto: TestBed.inject(TopbarContextoService),
    };
  }

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });

  it('slot de contexto vazio: sem separador nem buraco (nada renderizado)', async () => {
    const { raiz } = await montar(true);
    expect(raiz.querySelector('.topbar__contexto')).toBeNull();
  });

  it('slot de contexto preenchido: mostra o separador "//" e o rótulo', async () => {
    const { fixture, raiz, topbarContexto } = await montar(true);
    topbarContexto.definir('Campanha Alfa');
    fixture.detectChanges();

    const contexto = raiz.querySelector('.topbar__contexto');
    expect(contexto?.querySelector('.topbar__contexto-separador')?.textContent).toBe('//');
    expect(contexto?.querySelector('.topbar__contexto-rotulo')?.textContent).toBe('Campanha Alfa');
  });

  it('some de volta quando a página limpa o contexto ao sair', async () => {
    const { fixture, raiz, topbarContexto } = await montar(true);
    topbarContexto.definir('Campanha Alfa');
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__contexto')).not.toBeNull();

    topbarContexto.limpar();
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__contexto')).toBeNull();
  });

  it('monta o selo de tempo real uma única vez na topbar, autenticado ou não', async () => {
    const autenticado = await montar(true);
    expect(autenticado.raiz.querySelectorAll('app-indicador-tempo-real')).toHaveLength(1);

    TestBed.resetTestingModule();
    const anonimo = await montar(false);
    expect(anonimo.raiz.querySelectorAll('app-indicador-tempo-real')).toHaveLength(1);
  });

  it('Escape fecha o dropdown de perfil e devolve o foco ao gatilho', async () => {
    const { fixture, raiz } = await montar(true);
    const gatilho = raiz.querySelector<HTMLButtonElement>('.topbar__perfil-gatilho')!;
    gatilho.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__perfil-menu')).not.toBeNull();

    raiz
      .querySelector('.topbar__perfil')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(raiz.querySelector('.topbar__perfil-menu')).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('Escape não faz nada quando o dropdown já está fechado', async () => {
    const { fixture, raiz } = await montar(true);

    expect(() =>
      raiz
        .querySelector('.topbar__perfil')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    ).not.toThrow();
    fixture.detectChanges();
    expect(raiz.querySelector('.topbar__perfil-menu')).toBeNull();
  });
});
