import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { PatchnoteRecuperadoDto, PatchnoteResumoDto } from '@contratados-rpg/shared/dtos/patchnote';

import { VersaoService } from '../../core/services/versao.service';
import { PatchnotesPage } from './patchnotes.page';
import { patchnotesRoutes } from './patchnotes.routes';

const INDICE: PatchnoteResumoDto[] = [
  { versao: '1.1.0', data: '2026-09-29', titulo: 'Cenas e Biblioteca' },
  { versao: '1.0.0', data: '2026-09-01', titulo: 'O começo' },
];

function nota(versao: string, markdown: string): PatchnoteRecuperadoDto {
  const resumo = INDICE.find((item) => item.versao === versao)!;
  return { ...resumo, conteudoMarkdown: markdown };
}

const MARKDOWN_1_1_0 =
  'A mesa ficou mais organizada.\n\n## Novidades\n\n- **Cenas.** O mestre monta a mesa.\n\n## Correções\n\n- Ficha oculta some.';

describe('PatchnotesPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'patchnotes', children: patchnotesRoutes }], withComponentInputBinding()),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function raiz(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  async function abrir(url: string): Promise<void> {
    await harness.navigateByUrl(url, PatchnotesPage);
    harness.detectChanges();
  }

  async function responderIndice(itens: PatchnoteResumoDto[] = INDICE): Promise<void> {
    http.expectOne('/patchnote').flush({ sucesso: true, dados: itens, mensagem: 'ok' });
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function responderNota(recuperada: PatchnoteRecuperadoDto): Promise<void> {
    http
      .expectOne(`/patchnote/${recuperada.versao}`)
      .flush({ sucesso: true, dados: recuperada, mensagem: 'ok' });
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('mostra o carregando enquanto o índice não chega', async () => {
    await abrir('/patchnotes');

    expect(raiz().querySelector('[role="status"]')).not.toBeNull();
    http.expectOne('/patchnote');
  });

  it('leva a raiz à versão mais recente e renderiza a nota em blocos', async () => {
    await abrir('/patchnotes');
    await responderIndice();
    await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

    expect(TestBed.inject(Router).url).toBe('/patchnotes/1.1.0');
    expect(raiz().querySelector('.patchnotes__nota-versao b')?.textContent).toContain('v1.1.0');
    expect(raiz().querySelector('app-chip')?.textContent).toContain('Atual');
    expect(raiz().querySelector('.patchnotes__nota-titulo')?.textContent).toContain('Cenas e Biblioteca');
    expect(raiz().querySelector('.patchnotes__markdown--introducao')?.textContent).toContain(
      'A mesa ficou mais organizada.',
    );
    const blocos = Array.from(raiz().querySelectorAll('.patchnotes__bloco'));
    expect(blocos.map((bloco) => bloco.getAttribute('data-tom'))).toEqual(['novidades', 'correcoes']);
    expect(blocos[0].querySelector('li strong')?.textContent).toBe('Cenas.');
  });

  it('renderiza grupos por público, blocos de funcionalidade e resumo final', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    await responderNota(
      nota(
        '1.1.0',
        [
          'Este foi um update grande.',
          '',
          '# PARA OS PLAYERS',
          '',
          '## 🎬 Cenas substituem a Iniciativa',
          '',
          'Agora uma campanha pode ter **várias cenas**.',
          '',
          '- Investigação',
          '- Resistência',
          '',
          '## Novidades',
          '',
          '- Um item de balanço.',
          '',
          '# PARA O MESTRE',
          '',
          '## 📚 Biblioteca',
          '',
          'O mestre revela documentos.',
          '',
          '# RESUMO',
          '',
          'O maior impacto são as **Cenas**.',
        ].join('\n'),
      ),
    );

    const grupos = Array.from(raiz().querySelectorAll('.patchnotes__grupo'));
    expect(grupos.map((grupo) => grupo.querySelector('.patchnotes__grupo-titulo')?.textContent)).toEqual([
      'PARA OS PLAYERS',
      'PARA O MESTRE',
      'RESUMO',
    ]);
    expect(raiz().querySelector('.patchnotes__markdown--introducao')?.textContent).toContain(
      'Este foi um update grande.',
    );

    const funcionalidade = grupos[0].querySelector('.patchnotes__bloco--funcionalidade')!;
    expect(funcionalidade.querySelector('.patchnotes__bloco-titulo')?.textContent).toContain('🎬 Cenas');
    expect(funcionalidade.querySelector('strong')?.textContent).toBe('várias cenas');
    expect(funcionalidade.querySelectorAll('li')).toHaveLength(2);
    expect(grupos[0].querySelector('.patchnotes__bloco[data-tom="novidades"]')).not.toBeNull();
    expect(grupos[0].querySelector('.patchnotes__bloco[data-tom="novidades"].patchnotes__bloco--funcionalidade')).toBeNull();
    expect(grupos[2].querySelector('.patchnotes__markdown strong')?.textContent).toBe('Cenas');
    expect(grupos[2].querySelector('.patchnotes__bloco')).toBeNull();
  });

  it('lista as versões, marca a aberta e não põe "Atual" numa versão antiga', async () => {
    await abrir('/patchnotes/1.0.0');
    await responderIndice();
    await responderNota(nota('1.0.0', '## Novidades\n\n- Base.'));

    const itens = Array.from(raiz().querySelectorAll<HTMLAnchorElement>('.patchnotes__item'));
    expect(itens.map((item) => item.getAttribute('href'))).toEqual([
      '/patchnotes/1.1.0',
      '/patchnotes/1.0.0',
    ]);
    expect(itens[1].classList.contains('patchnotes__item--ativo')).toBe(true);
    expect(itens[1].getAttribute('aria-current')).toBe('page');
    expect(raiz().querySelector('app-chip')).toBeNull();
    expect(raiz().querySelector('.patchnotes__nota-rodape')).toBeNull();
  });

  it('oferece o atalho para a versão anterior', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

    const atalho = raiz().querySelector<HTMLAnchorElement>('.patchnotes__nota-rodape a')!;
    expect(atalho.getAttribute('href')).toBe('/patchnotes/1.0.0');
    expect(atalho.textContent).toContain('v1.0.0 (anterior)');
  });

  it('registra a versão atual como vista ao abrir', async () => {
    const versaoService = TestBed.inject(VersaoService);
    expect(versaoService.versaoNova()).toBe(true);

    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

    expect(versaoService.versaoNova()).toBe(false);
  });

  it('versão fora do índice vira o documento 404, sem pedir a nota', async () => {
    await abrir('/patchnotes/9.9.9');
    await responderIndice();

    expect(raiz().querySelector('app-documento-contencao')).not.toBeNull();
    expect(raiz().textContent).toContain('404');
    expect(raiz().textContent).toContain('Versão inexistente');
    expect(raiz().querySelector<HTMLAnchorElement>('a[href="/patchnotes"]')?.textContent).toContain(
      'Ver todas as versões',
    );
  });

  it('404 vindo da API também vira "Versão inexistente"', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    http.expectOne('/patchnote/1.1.0').flush('', { status: 404, statusText: 'Not Found' });
    harness.detectChanges();

    expect(raiz().textContent).toContain('Versão inexistente');
  });

  it('falha ao carregar a nota vira o documento 503 e "Tentar novamente" repete só a nota', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    http.expectOne('/patchnote/1.1.0').flush('', { status: 503, statusText: 'Service Unavailable' });
    harness.detectChanges();

    expect(raiz().textContent).toContain('503');
    expect(raiz().textContent).toContain('Falha na recuperação');

    raiz().querySelector<HTMLButtonElement>('button.contencao__acao')!.click();
    await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

    expect(raiz().querySelector('.patchnotes__nota')).not.toBeNull();
    expect(raiz().textContent).not.toContain('Falha na recuperação');
  });

  it('falha ao carregar o índice vira o 503 e "Tentar novamente" repete o índice', async () => {
    await abrir('/patchnotes');
    http.expectOne('/patchnote').flush('', { status: 0, statusText: 'Unknown Error' });
    harness.detectChanges();
    expect(raiz().textContent).toContain('Falha na recuperação');

    raiz().querySelector<HTMLButtonElement>('button.contencao__acao')!.click();
    await responderIndice();
    await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

    expect(raiz().querySelector('.patchnotes__nota')).not.toBeNull();
  });

  it('sem nenhuma versão publicada, mostra o estado vazio', async () => {
    await abrir('/patchnotes');
    await responderIndice([]);

    expect(raiz().querySelector('app-estado-vazio')?.textContent).toContain('Ainda não há notas de versão.');
    expect(raiz().querySelector('.patchnotes__nota')).toBeNull();
  });

  it('não deixa HTML, imagem nem link perigoso do Markdown chegarem ao DOM', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    await responderNota(
      nota(
        '1.1.0',
        [
          '<script>window.invadido = 1</script>',
          '',
          '## Novidades',
          '',
          '<img src=x onerror="window.invadido = 2">',
          '',
          '![pixel](https://exemplo.com/p.png)',
          '',
          '[clique](javascript:window.invadido=3) e [seguro](https://exemplo.com)',
          '',
          '<a href="javascript:void(0)" onclick="window.invadido=4">cru</a>',
        ].join('\n'),
      ),
    );

    const conteudo = raiz().querySelector('.patchnotes__nota')!;
    expect(conteudo.querySelector('script')).toBeNull();
    expect(conteudo.querySelector('img')).toBeNull();
    expect(conteudo.querySelector('[onerror], [onclick]')).toBeNull();
    expect(conteudo.querySelector('a[href^="javascript"]')).toBeNull();
    expect(conteudo.querySelector('a[href="https://exemplo.com/"]')?.getAttribute('rel')).toContain('noopener');
    expect((window as unknown as { invadido?: number }).invadido).toBeUndefined();
  });

  it('trocar de versão cancela o pedido da anterior', async () => {
    await abrir('/patchnotes/1.1.0');
    await responderIndice();
    const pedidoAntigo = http.expectOne('/patchnote/1.1.0');

    await abrir('/patchnotes/1.0.0');
    expect(pedidoAntigo.cancelled).toBe(true);
    await responderNota(nota('1.0.0', '## Novidades\n\n- Base.'));

    expect(raiz().querySelector('.patchnotes__nota-versao b')?.textContent).toContain('v1.0.0');
  });
});
