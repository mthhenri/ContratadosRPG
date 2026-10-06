import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { PatchnoteRecuperadoDto, PatchnoteResumoDto } from '@contratados-rpg/shared/dtos/patchnote';
import type { UsuarioAutenticadoDto } from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../core/services/sessao.service';
import { VersaoService } from '../../core/services/versao.service';
import { NotificacaoService } from '../../shared/ui/notificacao/notificacao.service';
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
    expect(raiz().querySelector('.patchnotes__nota app-chip')).toBeNull();
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

  describe('cabeçalho compacto (pn-08)', () => {
    function cabecalho(): HTMLElement | null {
      return raiz().querySelector<HTMLElement>('.patchnotes__trilho > .patchnotes__cabecalho');
    }

    it('abre o trilho de versões com o único h1 da página, sem frase de apresentação', async () => {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

      expect(raiz().querySelectorAll('h1')).toHaveLength(1);
      expect(cabecalho()!.querySelector('h1')?.textContent).toContain('Novidades do sistema');
      expect(cabecalho()!.textContent).toContain('// Patchnotes');
      expect(raiz().querySelector('.patchnotes__apresentacao')).toBeNull();
      expect(raiz().querySelector('.patchnotes__trilho nav[aria-label="Versões"]')).not.toBeNull();
    });

    it('mantém o cabeçalho enquanto o índice carrega e quando não há versões', async () => {
      await abrir('/patchnotes');
      expect(cabecalho()!.querySelector('h1')).not.toBeNull();
      expect(raiz().querySelector('[role="status"]')).not.toBeNull();

      await responderIndice([]);
      expect(cabecalho()!.querySelector('h1')).not.toBeNull();
      expect(raiz().querySelector('nav[aria-label="Versões"]')).toBeNull();
      expect(raiz().querySelector('app-estado-vazio')).not.toBeNull();
    });

    it('os estados de contenção continuam fora do grid, sem cabeçalho compacto', async () => {
      await abrir('/patchnotes/9.9.9');
      await responderIndice();

      expect(raiz().querySelector('.patchnotes__contencao app-documento-contencao')).not.toBeNull();
      expect(raiz().querySelector('.patchnotes__corpo')).toBeNull();
    });
  });

  describe('lista de versões (pn-10)', () => {
    const CHAVE_VISTA = 'contratados-rpg.versao-vista';

    function itens(): HTMLAnchorElement[] {
      return Array.from(raiz().querySelectorAll<HTMLAnchorElement>('.patchnotes__item'));
    }

    function chipsNovo(): string[] {
      return itens()
        .filter((item) => item.querySelector('app-chip[severidade="sucesso"], .chip--severidade-sucesso'))
        .map((item) => item.querySelector('b')!.textContent!.trim());
    }

    async function abrirLista(): Promise<void> {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_1_1_0));
    }

    it('mostra o título de cada versão e o selo "Atual" só na mais recente', async () => {
      await abrirLista();

      expect(itens().map((item) => item.querySelector('.patchnotes__item-titulo')?.textContent?.trim())).toEqual([
        'Cenas e Biblioteca',
        'O começo',
      ]);
      expect(itens()[0].querySelector('app-chip')?.textContent).toContain('Atual');
      expect(itens()[1].querySelector('app-chip')).toBeNull();
    });

    it('agrupa por linha MAJOR.MINOR com um rótulo por linha', async () => {
      await abrirLista();

      const rotulos = Array.from(raiz().querySelectorAll('.patchnotes__linha-rotulo')).map((rotulo) =>
        rotulo.textContent?.trim(),
      );
      expect(rotulos).toEqual(['v1.1.x', 'v1.0.x']);
    });

    it('marca como "Novo" as versões depois da última vista, lida antes de marcarVista', async () => {
      localStorage.setItem(CHAVE_VISTA, '1.0.0');
      await abrirLista();

      // A página já marcou a versão atual como vista, e mesmo assim a marca de "Novo" continua.
      expect(localStorage.getItem(CHAVE_VISTA)).toBe(TestBed.inject(VersaoService).versao);
      expect(chipsNovo()).toEqual(['v1.1.0']);
      expect(raiz().querySelector('.patchnotes__novas')?.textContent).toContain(
        '1 versão nova desde a sua última visita',
      );
    });

    it('versão vista igual à mais recente: nenhuma marca e nenhuma linha de aviso', async () => {
      localStorage.setItem(CHAVE_VISTA, '1.1.0');
      await abrirLista();

      expect(chipsNovo()).toEqual([]);
      expect(raiz().querySelector('.patchnotes__novas')).toBeNull();
    });

    it('primeira visita (sem versão vista): nada é "novo"', async () => {
      await abrirLista();

      expect(chipsNovo()).toEqual([]);
      expect(raiz().querySelector('.patchnotes__novas')).toBeNull();
    });

    it('storage que lança: sem marcas e sem erro', async () => {
      const lerOriginal = Storage.prototype.getItem;
      const gravarOriginal = Storage.prototype.setItem;
      // Só a chave da versão vista falha; o resto da página (sessão, tema) usa o storage normalmente.
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, chave: string) {
        if (chave === CHAVE_VISTA) {
          throw new Error('bloqueado');
        }
        return lerOriginal.call(this, chave);
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        chave: string,
        valor: string,
      ) {
        if (chave === CHAVE_VISTA) {
          throw new Error('bloqueado');
        }
        gravarOriginal.call(this, chave, valor);
      });
      await abrirLista();

      expect(itens()).toHaveLength(2);
      expect(chipsNovo()).toEqual([]);
    });

    afterEach(() => vi.restoreAllMocks());

    it('as marcas não somem ao clicar noutra versão', async () => {
      localStorage.setItem(CHAVE_VISTA, '1.0.0');
      await abrirLista();

      await abrir('/patchnotes/1.0.0');
      await responderNota(nota('1.0.0', '## Novidades\n\n- Base.'));

      expect(chipsNovo()).toEqual(['v1.1.0']);
    });
  });

  describe('sumário "Nesta versão" (pn-09)', () => {
    const MARKDOWN_SUMARIO = [
      '# PARA OS PLAYERS',
      '',
      '## 🎬 Cenas',
      '',
      'Texto das cenas.',
      '',
      '## Fichas',
      '',
      'Texto.',
      '',
      '# PARA O MESTRE',
      '',
      '## 📚 Biblioteca',
      '',
      'Texto da biblioteca.',
    ].join('\n');

    class ObservadorFalso {
      static instancias: ObservadorFalso[] = [];
      readonly observe = vi.fn();
      readonly unobserve = vi.fn();
      readonly disconnect = vi.fn();
      constructor(readonly aoCruzar: () => void) {
        ObservadorFalso.instancias.push(this);
      }
    }

    let rolarAte: ReturnType<typeof vi.fn>;
    let posicoes: Record<string, number>;

    beforeEach(() => {
      ObservadorFalso.instancias = [];
      vi.stubGlobal('IntersectionObserver', ObservadorFalso);
      rolarAte = vi.fn();
      Element.prototype.scrollIntoView = rolarAte as unknown as Element['scrollIntoView'];
      // jsdom não tem layout: o topo de cada título vem desta tabela (padrão: abaixo da linha).
      posicoes = {};
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const top = posicoes[this.id] ?? 900;
        return { top, bottom: top + 20, left: 0, right: 0, width: 0, height: 20, x: 0, y: top } as DOMRect;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    function trilho(): HTMLElement {
      return raiz().querySelector<HTMLElement>('.patchnotes__trilho-direito')!;
    }

    function itensTrilho(): string[] {
      return Array.from(trilho().querySelectorAll('.sumario__item')).map((item) => item.textContent!.trim());
    }

    function ativoNoTrilho(): string | null {
      return trilho().querySelector('[aria-current="location"]')?.textContent?.trim() ?? null;
    }

    async function abrirNota(markdown = MARKDOWN_SUMARIO): Promise<void> {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', markdown));
    }

    it('lista grupos como rótulos e blocos como itens, no trilho e na seção recolhível', async () => {
      await abrirNota();

      expect(Array.from(trilho().querySelectorAll('.sumario__rotulo')).map((r) => r.textContent!.trim())).toEqual([
        'PARA OS PLAYERS',
        'PARA O MESTRE',
      ]);
      expect(itensTrilho()).toEqual(['🎬 Cenas', 'Fichas', '📚 Biblioteca']);
      expect(trilho().querySelector('.patchnotes__rotulo')?.textContent).toContain('Nesta versão');
      expect(trilho().querySelector<HTMLAnchorElement>('.sumario__item')!.getAttribute('href')).toBe(
        '/patchnotes/1.1.0#cenas',
      );
    });

    it('a seção recolhível diz quantos capítulos tem e começa fechada', async () => {
      await abrirNota();

      const recolhivel = raiz().querySelector<HTMLDetailsElement>('.patchnotes__sumario-recolhivel')!;
      expect(recolhivel.open).toBe(false);
      expect(recolhivel.querySelector('summary')?.textContent).toContain('Nesta versão · 3 capítulos');
      expect(recolhivel.querySelectorAll('.sumario__item')).toHaveLength(3);
    });

    it('nota sem títulos não tem sumário', async () => {
      await abrirNota('Só um texto de abertura.');

      expect(raiz().querySelector('.patchnotes__trilho-direito')).toBeNull();
      expect(raiz().querySelector('.patchnotes__sumario-recolhivel')).toBeNull();
    });

    it('clicar num item rola até o capítulo, atualiza o fragmento e o destaca', async () => {
      await abrirNota();

      trilho().querySelectorAll<HTMLAnchorElement>('.sumario__item')[2].click();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(rolarAte.mock.contexts.map((contexto) => (contexto as HTMLElement).id)).toEqual(['biblioteca']);
      expect(TestBed.inject(Router).url).toBe('/patchnotes/1.1.0#biblioteca');
      expect(ativoNoTrilho()).toBe('📚 Biblioteca');
    });

    it('clicar num item da seção recolhível a fecha', async () => {
      await abrirNota();
      const recolhivel = raiz().querySelector<HTMLDetailsElement>('.patchnotes__sumario-recolhivel')!;
      recolhivel.open = true;

      recolhivel.querySelectorAll<HTMLAnchorElement>('.sumario__item')[1].click();
      harness.detectChanges();

      expect(recolhivel.open).toBe(false);
    });

    it('o observador destaca o último título que passou da linha de leitura e o grupo dele', async () => {
      await abrirNota();
      expect(ativoNoTrilho()).toBeNull();
      expect(ObservadorFalso.instancias).toHaveLength(1);

      posicoes = { 'para-os-players': -300, cenas: -200, fichas: -40, 'para-o-mestre': 700, biblioteca: 800 };
      ObservadorFalso.instancias[0].aoCruzar();
      harness.detectChanges();

      expect(ativoNoTrilho()).toBe('Fichas');
      const grupos = Array.from(trilho().querySelectorAll('.sumario__grupo'));
      expect(grupos.map((grupo) => grupo.classList.contains('sumario__grupo--ativo'))).toEqual([true, false]);

      posicoes = { 'para-os-players': -900, cenas: -800, fichas: -700, 'para-o-mestre': -100, biblioteca: -10 };
      ObservadorFalso.instancias[0].aoCruzar();
      harness.detectChanges();
      expect(ativoNoTrilho()).toBe('📚 Biblioteca');
      expect(grupos.map((grupo) => grupo.classList.contains('sumario__grupo--ativo'))).toEqual([false, true]);
    });

    it('a troca de versão refaz o sumário, zera o destaque e desconecta o observador anterior', async () => {
      await abrirNota();
      posicoes = { 'para-os-players': -300, cenas: -200 };
      ObservadorFalso.instancias[0].aoCruzar();
      harness.detectChanges();
      expect(ativoNoTrilho()).toBe('🎬 Cenas');

      await abrir('/patchnotes/1.0.0');
      await responderNota(nota('1.0.0', '## Novidades\n\n- Base.\n\n## Correções\n\n- X.'));

      expect(itensTrilho()).toEqual(['Novidades', 'Correções']);
      expect(ativoNoTrilho()).toBeNull();
      expect(ObservadorFalso.instancias[0].disconnect).toHaveBeenCalled();
      expect(ObservadorFalso.instancias).toHaveLength(2);
    });

    it('desconecta o observador ao destruir a página', async () => {
      await abrirNota();

      harness.fixture.destroy();

      expect(ObservadorFalso.instancias[0].disconnect).toHaveBeenCalled();
    });
  });

  describe('capítulos e âncoras (pn-07)', () => {
    const MARKDOWN_CAPITULOS = [
      '# PARA OS PLAYERS',
      '',
      '## 🎬 Cenas',
      '',
      'Texto das cenas.',
      '',
      '# PARA O MESTRE',
      '',
      '## 📚 Biblioteca',
      '',
      'Texto da biblioteca.',
    ].join('\n');

    let rolarAte: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // jsdom não implementa `scrollIntoView`.
      rolarAte = vi.fn();
      Element.prototype.scrollIntoView = rolarAte as unknown as Element['scrollIntoView'];
    });

    function alvosRolados(): (string | null)[] {
      return rolarAte.mock.contexts.map((contexto) => (contexto as HTMLElement).getAttribute('id'));
    }

    it('dá o id do capítulo a cada título de grupo e de bloco', async () => {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

      const ids = Array.from(
        raiz().querySelectorAll('.patchnotes__grupo-titulo, .patchnotes__bloco-titulo'),
      ).map((titulo) => titulo.getAttribute('id'));
      expect(ids).toEqual(['para-os-players', 'cenas', 'para-o-mestre', 'biblioteca']);
    });

    it('nota só com ## também ganha ids nos blocos', async () => {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

      const ids = Array.from(raiz().querySelectorAll('.patchnotes__bloco-titulo')).map((titulo) =>
        titulo.getAttribute('id'),
      );
      expect(ids).toEqual(['novidades', 'correcoes']);
    });

    it('com fragmento existente, rola até o capítulo depois que a nota renderiza', async () => {
      await abrir('/patchnotes/1.1.0#para-o-mestre');
      await responderIndice();
      expect(rolarAte).not.toHaveBeenCalled();
      await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

      expect(alvosRolados()).toEqual(['para-o-mestre']);
    });

    it('o fragmento vale para a versão de destino na troca de versão', async () => {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));
      expect(rolarAte).not.toHaveBeenCalled();

      await abrir('/patchnotes/1.0.0#biblioteca');
      expect(rolarAte).not.toHaveBeenCalled();
      await responderNota(nota('1.0.0', MARKDOWN_CAPITULOS));

      expect(alvosRolados()).toEqual(['biblioteca']);
    });

    it('fragmento inexistente é ignorado, sem erro e sem rolagem', async () => {
      await abrir('/patchnotes/1.1.0#nao-existe');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

      expect(rolarAte).not.toHaveBeenCalled();
      expect(raiz().querySelector('.patchnotes__nota')).not.toBeNull();
    });

    describe('copiar link', () => {
      let escreverTexto: ReturnType<typeof vi.fn>;

      function definirClipboard(escrever: (texto: string) => Promise<void>): void {
        escreverTexto = vi.fn(escrever);
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: escreverTexto },
          configurable: true,
        });
      }

      function botaoCopiar(id: string): HTMLButtonElement {
        return raiz().querySelector<HTMLButtonElement>(`[id="${id}"] .patchnotes__copiar-link`)!;
      }

      it('cada título tem o botão, com rótulo próprio', async () => {
        await abrir('/patchnotes/1.1.0');
        await responderIndice();
        await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

        expect(botaoCopiar('para-o-mestre').getAttribute('aria-label')).toBe(
          'Copiar link de PARA O MESTRE',
        );
        expect(botaoCopiar('cenas').getAttribute('aria-label')).toBe('Copiar link de 🎬 Cenas');
        expect(raiz().querySelectorAll('.patchnotes__copiar-link')).toHaveLength(4);
      });

      it('copia a URL absoluta com o fragmento, atualiza a URL sem rolar e notifica', async () => {
        definirClipboard(() => Promise.resolve());
        const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');
        await abrir('/patchnotes/1.1.0');
        await responderIndice();
        await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

        botaoCopiar('biblioteca').click();
        await harness.fixture.whenStable();
        harness.detectChanges();

        expect(escreverTexto).toHaveBeenCalledWith(
          `${window.location.origin}/patchnotes/1.1.0#biblioteca`,
        );
        expect(TestBed.inject(Router).url).toBe('/patchnotes/1.1.0#biblioteca');
        expect(notificar).toHaveBeenCalledWith(
          expect.objectContaining({ severidade: 'sucesso', resumo: 'Link copiado' }),
        );
        expect(rolarAte).not.toHaveBeenCalled();
      });

      it('falha do clipboard não quebra: avisa que o link está na barra de endereço', async () => {
        definirClipboard(() => Promise.reject(new Error('negado')));
        const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');
        await abrir('/patchnotes/1.1.0');
        await responderIndice();
        await responderNota(nota('1.1.0', MARKDOWN_CAPITULOS));

        botaoCopiar('cenas').click();
        await harness.fixture.whenStable();

        expect(TestBed.inject(Router).url).toBe('/patchnotes/1.1.0#cenas');
        expect(notificar).toHaveBeenCalledWith(
          expect.objectContaining({ severidade: 'informacao', resumo: 'Não foi possível copiar' }),
        );
      });
    });
  });


  describe('reiniciar cache (pn-06)', () => {
    function logarComo(tipo: TipoUsuarioEnum): void {
      TestBed.inject(SessaoService).substituirSessao({
        token: 't',
        id: 1,
        login: 'a',
        nome: 'A',
        tipo,
      } as UsuarioAutenticadoDto);
    }

    function botaoReiniciar(): HTMLButtonElement | null {
      return raiz().querySelector<HTMLButtonElement>('.patchnotes__reiniciar-cache');
    }

    it('não aparece para visitante nem para conta NORMAL', async () => {
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_1_1_0));
      expect(botaoReiniciar()).toBeNull();

      logarComo(TipoUsuarioEnum.NORMAL);
      harness.detectChanges();
      expect(botaoReiniciar()).toBeNull();
    });

    it('o ADMIN reinicia, recarrega índice e nota sem cache do navegador e é notificado', async () => {
      logarComo(TipoUsuarioEnum.ADMIN);
      const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');
      await abrir('/patchnotes/1.1.0');
      await responderIndice();
      await responderNota(nota('1.1.0', MARKDOWN_1_1_0));

      const botao = botaoReiniciar()!;
      expect(botao.getAttribute('aria-label')).toBe('Reiniciar o cache dos patchnotes');
      botao.click();
      harness.detectChanges();
      expect(botao.disabled).toBe(true);

      const reinicio = http.expectOne('/patchnote/cache/reiniciar');
      expect(reinicio.request.method).toBe('POST');
      reinicio.flush({ sucesso: true, dados: { entradasRemovidas: 2 }, mensagem: 'ok' });

      const indice = http.expectOne('/patchnote');
      expect(indice.request.headers.get('Cache-Control')).toBe('no-cache');
      // Cópia: a resposta HTTP real é sempre um array novo (o mesmo objeto não muda o signal).
      indice.flush({ sucesso: true, dados: [...INDICE], mensagem: 'ok' });
      await harness.fixture.whenStable();
      harness.detectChanges();

      const recarga = http.expectOne('/patchnote/1.1.0');
      expect(recarga.request.headers.get('Cache-Control')).toBe('no-cache');
      recarga.flush({
        sucesso: true,
        dados: { ...nota('1.1.0', MARKDOWN_1_1_0), titulo: 'Corrigida' },
        mensagem: 'ok',
      });
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(raiz().querySelector('.patchnotes__nota-titulo')?.textContent).toContain('Corrigida');
      expect(botao.disabled).toBe(false);
      expect(notificar).toHaveBeenCalledWith(
        expect.objectContaining({ severidade: 'sucesso', resumo: 'Cache dos patchnotes reiniciado' }),
      );

      await abrir('/patchnotes/1.0.0');
      expect(http.expectOne('/patchnote/1.0.0').request.headers.has('Cache-Control')).toBe(false);
    });
  });
});
