import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { signal } from '@angular/core';
import {
  ArquetipoEnum,
  ClasseEnum,
  ComportamentoCriaturaEnum,
  NivelAmeacaEnum,
  PorteCriaturaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { CampanhaMembroResumoDto, CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { CampanhaDetalheMestre } from './detalhe-mestre.page';
import { EspectadorFichaCard } from '../../componentes/espectador-ficha-card/espectador-ficha-card.component';
import { CriaturaEsquadraoCard } from '../../componentes/criatura-esquadrao-card/criatura-esquadrao-card.component';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';

/**
 * Prova o redesenho de `CampanhaDetalheMestre` (`campanha-detalhe-mestre-coluna-acoes.spec.md`,
 * entregável 3): coluna de ações no lugar do menu kebab + botões flutuantes, Esquadrão/Criaturas
 * em grid reusando `EspectadorFichaCard`, sem banner de crítico nem coluna "Membros" ao lado, e
 * "Abrir ficha" disparando `FichaFlutuante`.
 */
describe('CampanhaDetalheMestre', () => {
  const CAMPANHA_ID = 8;

  const campanhaBase: CampanhaRecuperadaDto = {
    id: CAMPANHA_ID,
    nome: 'Contenção Delta',
    descricao: 'Operação em curso',
    codigoConvite: 'DEF456',
    codigoConviteEspectador: 'ESP456',
    naBase: true,
  };

  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
    { usuarioId: 3, nome: 'Espião', papel: TipoCampanhaMembroPapelEnum.ESPECTADOR, fichas: [] },
  ];

  const fichas: FichaResumoDto[] = [
    {
      id: 4,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
      imagemUrl: '/uploads/agentes/dev/vera.png',
      usuarioId: 2,
      nome: 'Vera',
      classe: ClasseEnum.SUPORTE,
      arquetipo: ArquetipoEnum.PARAMEDICO,
      nivel: 1,
      vidaAtual: 15,
      vidaMaxima: 34,
      energiaAtual: 18,
      energiaMaxima: 18,
      morrendo: false,
      machucado: false,
      inconsciente: false,
    },
    {
      id: 9,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
      imagemUrl: null,
      usuarioId: 1,
      nome: 'Aberração',
      tipo: TipoFichaEnum.CRIATURA,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 1,
      vidaAtual: 20,
      vidaMaxima: 20,
      energiaAtual: 0,
      energiaMaxima: 0,
      morrendo: false,
      machucado: false,
      inconsciente: false,
      na: NivelAmeacaEnum.MEDIA,
      defesa: 10,
      registro: 'SCP-049',
      porte: PorteCriaturaEnum.GRANDE,
      comportamento: ComportamentoCriaturaEnum.CACADORA,
    } as FichaResumoDto,
  ];

  function montar() {
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(membros)),
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      alterarEstado: vi.fn((_id: number, naBase: boolean) => of({ id: CAMPANHA_ID, naBase })),
      alterarCampanha: vi.fn(() => of({ ...campanhaBase })),
      excluirCampanha: vi.fn(() => of(undefined)),
      removerMembro: vi.fn(() => of({ campanhaId: CAMPANHA_ID, usuarioId: 0 })),
      transferirMestre: vi.fn(() =>
        of({ campanhaId: CAMPANHA_ID, mestreAnteriorUsuarioId: 0, novoMestreUsuarioId: 0 }),
      ),
      alterarPapelMembro: vi.fn((_id: number, usuarioId: number, papel: TipoCampanhaMembroPapelEnum) =>
        of({ campanhaId: CAMPANHA_ID, usuarioId, papel }),
      ),
      regenerarConvite: vi.fn(() => of({ id: CAMPANHA_ID, codigoConvite: 'NOVO' })),
      regenerarConviteEspectador: vi.fn(() => of({ id: CAMPANHA_ID, codigoConviteEspectador: 'NOVOESP' })),
    };
    const fichaService = {
      listarFichas: vi.fn(() => of(fichas)),
      duplicarFicha: vi.fn((id: number) => of({ id: 100, campanhaId: CAMPANHA_ID, usuarioId: 2, nome: `Clone de ${id}` })),
      atribuirCampanha: vi.fn((id: number) => of({ id, campanhaId: null })),
      excluirFicha: vi.fn(() => of(undefined)),
      // `FichaFlutuante`/`FichaFlutuanteConteudo` são componentes reais no template (não
      // mockados) — precisam de um retorno válido assim que `abrir()` é chamado.
      recuperarFicha: vi.fn((id: number) => {
        const ficha = fichas.find((item) => item.id === id);
        return of({
          id,
          campanhaId: CAMPANHA_ID,
          usuarioId: ficha?.usuarioId ?? 0,
          nome: ficha?.nome ?? '',
          dados: {
            nivel: ficha?.nivel ?? 1,
            classe: ficha?.classe ?? ClasseEnum.COMBATENTE,
            arquetipo: ficha?.arquetipo ?? null,
            prestigio: 0,
            atributos: {
              destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
              intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
            },
            maestria: null,
            habilidades: [],
            inventario: { itens: [], amplificadores: [] },
            anotacoes: '',
            estado: {
              vidaAtual: ficha?.vidaAtual ?? 0,
              vidaMaxima: ficha?.vidaMaxima,
              energiaAtual: ficha?.energiaAtual ?? 0,
              energiaMaxima: ficha?.energiaMaxima,
              sequelas: [], traumas: [], lesoes: [],
            },
          },
        });
      }),
      recuperarFichaCriatura: vi.fn(() => of({})),
    };
    const rolagemService = { listarPorCampanha: vi.fn(() => of([])) };
    const sessaoService = { usuario: () => ({ id: 1, login: 'x', nome: 'x' }) };
    const paginaCadernoService = {
      listarPaginas: vi.fn(() => of([])),
      listarPaginasMembro: vi.fn(() => of([])),
      buscarCampanha: vi.fn(() => of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 })),
    };
    const confirmacaoService = { confirmar: vi.fn(() => Promise.resolve(true)) };
    const topbarContexto = { definir: vi.fn(), limpar: vi.fn() };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      enviarPresencaEsquadrao: vi.fn(),
      fichaCriada$: new Subject().asObservable(),
      membroEntrou$: new Subject().asObservable(),
      fichaAlterada$: new Subject().asObservable(),
      fichaVisibilidadeAlterada$: new Subject().asObservable(),
      fichaCondicoesAlteradas$: new Subject().asObservable(),
      fichaRemovidaDaCampanha$: new Subject().asObservable(),
      rolagemRegistrada$: new Subject().asObservable(),
      rolagemExcluida$: new Subject().asObservable(),
      estadoAlterado$: new Subject().asObservable(),
      inventarioAlterado$: new Subject().asObservable(),
      paginaEsquadraoCriada$: new Subject().asObservable(),
      paginaEsquadraoAlterada$: new Subject().asObservable(),
      paginaEsquadraoExcluida$: new Subject().asObservable(),
      presencaEsquadraoCaderno$: new Subject().asObservable(),
      reconexao: signal(0),
      conectado: () => true,
    };

    TestBed.configureTestingModule({
      imports: [CampanhaDetalheMestre],
      providers: [
        provideRouter([]),
        CampanhaDetalheDadosService,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: TopbarContextoService, useValue: topbarContexto },
        { provide: PaginaCadernoService, useValue: paginaCadernoService },
        { provide: ConfirmacaoService, useValue: confirmacaoService },
      ],
    });

    const dados = TestBed.inject(CampanhaDetalheDadosService);
    dados.inicializar(CAMPANHA_ID);
    TestBed.inject(ApplicationRef).tick();

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(CampanhaDetalheMestre);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      fichaService,
      campanhaService,
      confirmacaoService,
      dados,
      navegar,
    };
  }

  function abrirDialogMembros(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) {
    (Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find((el) => el.textContent?.trim() === 'Membros') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('enquanto carrega, mostra a casca real com a silhueta de cabeçalho, cartões e painel lateral', () => {
    const { fixture, raiz, dados } = montar();
    dados.carregando.set(true);
    fixture.detectChanges();

    const conteudo = raiz.querySelector('.detalhe-mestre__conteudo');
    expect(conteudo?.getAttribute('role')).toBe('status');
    expect(conteudo?.getAttribute('aria-label')).toBe('Carregando campanha');
    expect(raiz.querySelectorAll('app-coluna-acoes app-esqueleto').length).toBeGreaterThan(0);
    expect(raiz.querySelectorAll('.detalhe-mestre__esqueleto-card').length).toBeGreaterThan(0);
    expect(raiz.querySelector('.detalhe-mestre__painel-lateral app-esqueleto')).not.toBeNull();
    expect(raiz.querySelector('app-espectador-ficha-card')).toBeNull();
  });

  it('renderiza a coluna de ações com Membros, Iniciativa, Convites, Editar, Excluir, Calculadora, Caderno', () => {
    const { raiz } = montar();
    const rotulos = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).map((el) =>
      el.textContent?.trim(),
    );
    expect(rotulos).toEqual(
      expect.arrayContaining(['Membros', 'Iniciativa', 'Convites', 'Editar', 'Excluir', 'Calculadora', 'Caderno']),
    );
  });

  it('não renderiza banner de crítico nem coluna "Membros" ao lado do Esquadrão', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('.detalhe-mestre__banner-alerta')).toBeNull();
    expect(raiz.querySelector('.detalhe-mestre__coluna--membros')).toBeNull();
  });

  it('renderiza o Esquadrão com app-espectador-ficha-card em modo interativo', () => {
    const { fixture } = montar();
    const cartao = fixture.debugElement.query(By.directive(EspectadorFichaCard));
    expect(cartao).not.toBeNull();
    expect(cartao.componentInstance.mostrarAcoes()).toBe(true);
  });

  it('entrega ao cartão a última rolagem já carregada no feed para a mesma ficha', () => {
    const { fixture, dados } = montar();
    dados.rolagensFeed.set([
      {
        id: 77,
        fichaId: 4,
        encontroCombatenteId: null,
        campanhaId: CAMPANHA_ID,
        usuarioId: 2,
        nomeAutor: 'Jogador',
        nomeFicha: 'Vera',
        rotulo: 'Destreza',
        formula: null,
        visibilidade: 'PUBLICA' as never,
        resultado: { dados: [], atributos: [], constante: 19, total: 19 },
        createdDate: new Date().toISOString(),
        corFicha: null,
      },
    ]);
    fixture.detectChanges();

    const cartao = fixture.debugElement.query(By.directive(EspectadorFichaCard));
    expect(cartao.componentInstance.ultimaRolagem()?.id).toBe(77);
  });

  it('renderiza a subseção Criaturas com app-criatura-esquadrao-card, registro/porte/comportamento/NA e a barra de Vida', () => {
    const { raiz, fixture } = montar();
    const cartao = fixture.debugElement.query(By.directive(CriaturaEsquadraoCard));
    expect(cartao).not.toBeNull();
    expect(raiz.querySelector('.criatura-card__nome')?.textContent).toContain('Aberração');
    expect(raiz.querySelector('.criatura-card__registro')?.textContent).toContain('SCP-049');
    const classificacao = raiz.querySelector('.criatura-card__classificacao')?.textContent ?? '';
    expect(classificacao).toContain('Grande');
    expect(classificacao).toContain('Caçadora');
    expect(classificacao).toContain('Média');
    expect(raiz.querySelector('app-criatura-esquadrao-card app-barra-recurso')).not.toBeNull();
  });

  it('abre a ficha flutuante ao emitir abrirFicha do cartão do Esquadrão', () => {
    const { fixture } = montar();
    const spy = vi.spyOn(fixture.componentInstance['fichaFlutuanteRef']()!, 'abrir');
    const cartao = fixture.debugElement.query(By.directive(EspectadorFichaCard));
    cartao.componentInstance.abrirFicha.emit();
    expect(spy).toHaveBeenCalledWith({ fichaId: 4, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 2 });
  });

  it('abre a ficha flutuante ao emitir abrirFicha do cartão de criatura', () => {
    const { fixture } = montar();
    // `mockImplementation` — sem chamar through: `FichaFlutuante.abrir()` real dispara
    // `CriaturaVisualizacao`, que a fixture rasa `recuperarFichaCriatura: () => of({})` deste
    // spec não sustenta (crasha em `.vd` de documento vazio). Só a chamada em si prova o roteamento.
    const spy = vi
      .spyOn(fixture.componentInstance['fichaFlutuanteRef']()!, 'abrir')
      .mockImplementation(() => {});
    const cartao = fixture.debugElement.query(By.directive(CriaturaEsquadraoCard));
    cartao.componentInstance.abrirFicha.emit();
    expect(spy).toHaveBeenCalledWith({ fichaId: 9, tipo: TipoFichaEnum.CRIATURA, usuarioIdDono: 1 });
  });

  it('"Abrir ficha completa" do menu "⋯" vai pro acervo (jogador) ou pra rota de criatura da campanha (criatura)', () => {
    const { raiz, fixture } = montar();
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);

    (raiz.querySelector('.espectador-ficha__menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe-mestre__ficha-menu-item') as HTMLButtonElement).click();
    expect(abrir).toHaveBeenCalledWith(expect.stringContaining('/fichas/4'), '_blank', 'noopener');

    abrir.mockClear();
    (raiz.querySelector('.criatura-card__menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe-mestre__ficha-menu-item') as HTMLButtonElement).click();
    expect(abrir).toHaveBeenCalledWith(
      expect.stringContaining(`/campanhas/${CAMPANHA_ID}/criatura/9`),
      '_blank',
      'noopener',
    );
  });

  it('duplica uma criatura pelo mesmo menu "⋯" do cartão, sem exigir dono', () => {
    const { raiz, fixture, fichaService } = montar();
    (raiz.querySelector('.criatura-card__menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();

    (raiz.querySelector('.detalhe-mestre__ficha-menu-item:nth-child(2)') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.dialogo__aviso')?.textContent).not.toContain('de "');

    const confirmar = Array.from(raiz.querySelectorAll('app-modal button')).find((el) =>
      el.textContent?.includes('Confirmar duplicação'),
    ) as HTMLButtonElement;
    confirmar.click();

    expect(fichaService.duplicarFicha).toHaveBeenCalledWith(9);
  });

  it('esconde o gatilho flutuante próprio da calculadora e do caderno (consolidados na coluna de ações)', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('.calc-flutuante__gatilho')).toBeNull();
    expect(raiz.querySelector('.caderno__gatilho')).toBeNull();
  });

  it('abre a dialog de duplicar e chama FichaService.duplicarFicha ao confirmar', () => {
    const { fixture, raiz, fichaService } = montar();
    (raiz.querySelector('.espectador-ficha__menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();

    (Array.from(raiz.querySelectorAll('.detalhe-mestre__ficha-menu-item')).find((el) =>
      el.textContent?.includes('Duplicar'),
    ) as HTMLButtonElement).click();
    fixture.detectChanges();

    const confirmar = Array.from(raiz.querySelectorAll('app-modal button')).find((el) =>
      el.textContent?.includes('Confirmar duplicação'),
    ) as HTMLButtonElement;
    confirmar.click();

    expect(fichaService.duplicarFicha).toHaveBeenCalledWith(4);
  });

  it('a coluna de ações não tem max-width artificial (usa toda a largura restante)', () => {
    const { fixture } = montar();
    const el = fixture.debugElement.query(By.css('.detalhe-mestre__conteudo')).nativeElement as HTMLElement;
    const estilo = getComputedStyle(el);
    expect(estilo.maxWidth === 'none' || estilo.maxWidth === '').toBe(true);
  });

  describe('dialog "Membros"', () => {
    it('abre ao clicar no item da coluna de ações e lista os membros com carteirinha, sem clique', () => {
      const { raiz, fixture } = montar();
      abrirDialogMembros(raiz, fixture);

      expect(raiz.querySelector('app-modal')?.textContent).toContain('Membros');
      const carteirinhas = raiz.querySelectorAll('.detalhe-mestre__membro-carteirinha');
      expect(carteirinhas.length).toBeGreaterThan(0);
      expect(Array.from(carteirinhas).some((el) => el.tagName === 'BUTTON')).toBe(false);
    });

    it('abre a prévia completa depois do hover sustentado no avatar do Esquadrão e fecha ao sair', () => {
      vi.useFakeTimers();
      try {
        const { raiz, fixture } = montar();
        const cartao = fixture.debugElement.query(By.directive(EspectadorFichaCard));
        const avatar = cartao.nativeElement.querySelector('.espectador-ficha__avatar') as HTMLElement;

        avatar.dispatchEvent(new MouseEvent('mouseenter'));
        vi.advanceTimersByTime(599);
        fixture.detectChanges();
        expect(raiz.querySelector('.detalhe-mestre__avatar-preview')).toBeNull();

        vi.advanceTimersByTime(1);
        fixture.detectChanges();
        const preview = raiz.querySelector('.detalhe-mestre__avatar-preview img') as HTMLImageElement;
        expect(preview.src).toContain('/uploads/agentes/dev/vera.png');

        avatar.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        expect(raiz.querySelector('.detalhe-mestre__avatar-preview')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('mostra a ação "Prévia" só para membros com papel JOGADOR', () => {
      const { raiz, fixture } = montar();
      abrirDialogMembros(raiz, fixture);

      const acoesPrevia = raiz.querySelectorAll('[aria-label^="Pré-visualizar como"]');
      // membros fixture: 1 MESTRE + 1 JOGADOR
      expect(acoesPrevia.length).toBe(1);
    });

    it('"Prévia" navega para a rota de prévia do jogador e fecha a dialog', () => {
      const { raiz, fixture, navegar } = montar();
      abrirDialogMembros(raiz, fixture);

      (raiz.querySelector('[aria-label^="Pré-visualizar como"]') as HTMLButtonElement).click();

      expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'previa', 2]);
      fixture.detectChanges();
      expect(raiz.querySelector('app-modal')).toBeNull();
    });

    it('"Remover" pede confirmação e, ao confirmar, chama CampanhaService.removerMembro', async () => {
      const { raiz, fixture, campanhaService } = montar();
      abrirDialogMembros(raiz, fixture);

      const remover = Array.from(raiz.querySelectorAll('.detalhe-mestre__membro-acoes button')).find(
        (el) => el.getAttribute('aria-label')?.startsWith('Remover'),
      ) as HTMLButtonElement;
      remover.click();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(campanhaService.removerMembro).toHaveBeenCalledWith(CAMPANHA_ID, 2);
    });

    it('"Transferir mestre" pede confirmação inline e chama CampanhaService.transferirMestre', () => {
      const { raiz, fixture, campanhaService } = montar();
      abrirDialogMembros(raiz, fixture);

      const transferir = Array.from(raiz.querySelectorAll('.detalhe-mestre__membro-acoes button')).find(
        (el) => el.getAttribute('aria-label')?.startsWith('Transferir'),
      ) as HTMLButtonElement;
      transferir.click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe-mestre__membro-confirmacao')).not.toBeNull();
      (raiz.querySelector('.detalhe-mestre__membro-confirmacao-acoes button') as HTMLButtonElement).click();

      expect(campanhaService.transferirMestre).toHaveBeenCalledWith(CAMPANHA_ID, 2);
    });

    it('é o dobro da largura padrão e organiza os membros em grade de 2 colunas por categoria (mestre | vazio, jogadores, espectadores)', () => {
      const { raiz, fixture } = montar();
      abrirDialogMembros(raiz, fixture);

      const modal = raiz.querySelector('.modal') as HTMLElement;
      expect(modal.style.getPropertyValue('--modal-largura')).toBe('960px');

      const grade = raiz.querySelector('.detalhe-mestre__membros-grade') as HTMLElement;
      expect(getComputedStyle(grade).display).toBe('grid');

      const filhos = Array.from(grade.children);
      // 1ª linha: card do Mestre seguido da célula vazia (contrato "mestre | vazio").
      expect(filhos[0].classList.contains('detalhe-mestre__membro')).toBe(true);
      expect(filhos[0].textContent).toContain('Mestre');
      expect(filhos[1].classList.contains('detalhe-mestre__membro-vazio')).toBe(true);

      const categorias = Array.from(grade.querySelectorAll('.detalhe-mestre__membros-categoria')).map(
        (el) => el.textContent?.trim(),
      );
      expect(categorias).toEqual(['Jogadores', 'Espectadores']);
    });
  });

  describe('dialog "Editar campanha"', () => {
    it('abre como dialog (não mais formulário inline) ao clicar em "Editar" na coluna de ações', () => {
      const { raiz, fixture } = montar();
      expect(raiz.querySelector('app-modal')).toBeNull();

      (Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find((el) => el.textContent?.trim() === 'Editar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-modal')?.textContent).toContain('Editar campanha');
      expect((raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement).value).toBe(campanhaBase.nome);
    });

    it('Salvar chama CampanhaService.alterarCampanha e fecha a dialog', () => {
      const { raiz, fixture, campanhaService } = montar();
      (Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find((el) => el.textContent?.trim() === 'Editar') as HTMLButtonElement).click();
      fixture.detectChanges();

      const nome = raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement;
      nome.value = 'Contenção Delta II';
      nome.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const salvar = Array.from(raiz.querySelectorAll('app-modal button')).find((el) =>
        el.textContent?.includes('Salvar'),
      ) as HTMLButtonElement;
      salvar.click();

      expect(campanhaService.alterarCampanha).toHaveBeenCalledWith(
        CAMPANHA_ID,
        expect.objectContaining({ nome: 'Contenção Delta II' }),
      );
      fixture.detectChanges();
      expect(raiz.querySelector('app-modal')).toBeNull();
    });
  });

  describe('coluna de ações', () => {
    it('tem separadores categorizando os itens, cada um com um título/subtítulo', () => {
      const { raiz } = montar();
      const categorias = Array.from(raiz.querySelectorAll('.coluna-acoes__categoria'));
      expect(categorias.length).toBeGreaterThan(0);
      expect(categorias.every((el) => el.textContent?.trim().length)).toBe(true);
    });

    it('Calculadora alterna aberta/fechada ao clicar de novo no mesmo item', () => {
      const { raiz, fixture } = montar();
      const itemCalculadora = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find(
        (el) => el.textContent?.trim() === 'Calculadora',
      ) as HTMLButtonElement;

      expect(itemCalculadora.getAttribute('aria-pressed')).toBe('false');

      itemCalculadora.click();
      fixture.detectChanges();
      expect(raiz.querySelector('app-calculadora-flutuante .painel-flutuante__janela')).not.toBeNull();
      expect(itemCalculadora.getAttribute('aria-pressed')).toBe('true');
      expect(itemCalculadora.classList).toContain('coluna-acoes__item--ativo');

      itemCalculadora.click();
      fixture.detectChanges();
      expect(raiz.querySelector('app-calculadora-flutuante .painel-flutuante__janela')).toBeNull();
      expect(itemCalculadora.getAttribute('aria-pressed')).toBe('false');
    });

    it('Caderno alterna aberto/fechado ao clicar de novo no mesmo item', () => {
      const { raiz, fixture } = montar();
      const itemCaderno = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find(
        (el) => el.textContent?.trim() === 'Caderno',
      ) as HTMLButtonElement;

      expect(itemCaderno.getAttribute('aria-pressed')).toBe('false');

      itemCaderno.click();
      fixture.detectChanges();
      expect(raiz.querySelector('app-caderno-flutuante .painel-flutuante__janela')).not.toBeNull();
      expect(itemCaderno.getAttribute('aria-pressed')).toBe('true');

      itemCaderno.click();
      fixture.detectChanges();
      expect(raiz.querySelector('app-caderno-flutuante .painel-flutuante__janela')).toBeNull();
      expect(itemCaderno.getAttribute('aria-pressed')).toBe('false');
    });

    function itemColuna(raiz: HTMLElement, rotulo: string): HTMLElement {
      return Array.from(raiz.querySelectorAll<HTMLElement>('[app-coluna-acoes-item]')).find(
        (el) => el.textContent?.trim() === rotulo,
      )!;
    }

    it('Membros, Convites e Editar ficam selecionados enquanto a dialog respectiva está aberta', () => {
      const { raiz, fixture } = montar();
      for (const rotulo of ['Membros', 'Convites', 'Editar']) {
        expect(itemColuna(raiz, rotulo).getAttribute('aria-pressed'), rotulo).toBe('false');
      }

      itemColuna(raiz, 'Membros').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Membros').getAttribute('aria-pressed')).toBe('true');
      expect(itemColuna(raiz, 'Convites').getAttribute('aria-pressed')).toBe('false');
      fixture.componentInstance['dialogMembrosAberta'].set(false);

      itemColuna(raiz, 'Convites').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Convites').getAttribute('aria-pressed')).toBe('true');
      expect(itemColuna(raiz, 'Membros').getAttribute('aria-pressed')).toBe('false');
      fixture.componentInstance['dialogConvitesAberta'].set(false);

      itemColuna(raiz, 'Editar').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Editar').getAttribute('aria-pressed')).toBe('true');
      fixture.componentInstance['cancelarEdicao']();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Editar').getAttribute('aria-pressed')).toBe('false');
    });

    it('Excluir fica selecionado enquanto a confirmação de exclusão está aberta', async () => {
      const { raiz, fixture, confirmacaoService } = montar();
      let resolver: (valor: boolean) => void = () => undefined;
      confirmacaoService.confirmar.mockImplementation(
        () => new Promise<boolean>((resolve) => (resolver = resolve)),
      );

      itemColuna(raiz, 'Excluir').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Excluir').getAttribute('aria-pressed')).toBe('true');

      resolver(false);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Excluir').getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('"Remover da campanha" (menu do cartão da ficha)', () => {
    it('pede confirmação e só desatribui a ficha depois de confirmar', async () => {
      const { fixture, fichaService, confirmacaoService } = montar();

      fixture.componentInstance['pedirRemoverDaCampanha'](3, 'Kane');
      expect(confirmacaoService.confirmar).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Remover da campanha', entidade: 'Kane', severidade: 'padrao' }),
      );
      expect(fichaService.atribuirCampanha).not.toHaveBeenCalled();

      await Promise.resolve();
      await Promise.resolve();
      expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(3, null);
    });

    it('cancelar a confirmação não desatribui a ficha', async () => {
      const { fixture, fichaService, confirmacaoService } = montar();
      confirmacaoService.confirmar.mockResolvedValue(false);

      fixture.componentInstance['pedirRemoverDaCampanha'](3, 'Kane');
      await Promise.resolve();
      await Promise.resolve();

      expect(fichaService.atribuirCampanha).not.toHaveBeenCalled();
    });
  });

  describe('dialog "Convites"', () => {
    function abrirDialogConvites(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) {
      (Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find((el) => el.textContent?.trim() === 'Convites') as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    it('abre e mostra os dois códigos de convite', () => {
      const { raiz, fixture } = montar();
      abrirDialogConvites(raiz, fixture);

      expect(raiz.querySelector('app-modal')?.textContent).toContain(campanhaBase.codigoConvite);
      expect(raiz.querySelector('app-modal')?.textContent).toContain(campanhaBase.codigoConviteEspectador);
    });

    it('copia o código de convite de jogador', async () => {
      const { raiz, fixture } = montar();
      abrirDialogConvites(raiz, fixture);

      const copiar = raiz.querySelector('.detalhe-mestre__convite button') as HTMLButtonElement;
      copiar.click();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(campanhaBase.codigoConvite);
    });

    it('pede confirmação antes de regenerar o convite de espectador e chama o serviço ao confirmar', async () => {
      const { raiz, fixture, campanhaService, confirmacaoService } = montar();
      abrirDialogConvites(raiz, fixture);

      const regenerarEspectador = Array.from(raiz.querySelectorAll('button')).find(
        (el) => el.getAttribute('aria-label') === 'Regenerar código de convite de espectador',
      ) as HTMLButtonElement;
      regenerarEspectador.click();

      expect(confirmacaoService.confirmar).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Regenerar convite de espectador' }),
      );
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(campanhaService.regenerarConviteEspectador).toHaveBeenCalledWith(CAMPANHA_ID);
    });

    it('tem o link "Painel" para o Painel do espectador em modo de prévia', () => {
      const { raiz, fixture } = montar();
      abrirDialogConvites(raiz, fixture);

      const link = Array.from(raiz.querySelectorAll('a')).find((el) => el.textContent?.includes('Painel'));
      expect(link?.getAttribute('href')).toBe(`/campanhas/${CAMPANHA_ID}/espectador`);
    });
  });

  describe('painel lateral fixo Rolagens ⇆ Inventário', () => {
    it('está sempre montado (não é overlay) e começa em Rolagens', () => {
      const { raiz } = montar();
      expect(raiz.querySelector('.detalhe-mestre__painel-lateral')).not.toBeNull();
      expect(
        (raiz.querySelector('.detalhe-mestre__painel-rolagens') as HTMLElement).hidden,
      ).toBe(false);
      expect(
        (raiz.querySelector('.detalhe-mestre__painel-inventario') as HTMLElement).hidden,
      ).toBe(true);
    });

    it('alterna para Inventário mantendo os dois montados no DOM (só [hidden] muda)', () => {
      const { raiz, fixture } = montar();
      const itemInventario = Array.from(raiz.querySelectorAll('[app-segmentado-item]')).find((el) =>
        el.textContent?.includes('Inventário'),
      ) as HTMLButtonElement;
      itemInventario.click();
      fixture.detectChanges();

      expect(
        (raiz.querySelector('.detalhe-mestre__painel-rolagens') as HTMLElement).hidden,
      ).toBe(true);
      expect(
        (raiz.querySelector('.detalhe-mestre__painel-inventario') as HTMLElement).hidden,
      ).toBe(false);
      expect(raiz.querySelector('app-inventario-esquadrao')).not.toBeNull();
    });
  });
});
