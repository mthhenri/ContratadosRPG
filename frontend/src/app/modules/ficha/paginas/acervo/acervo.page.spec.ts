import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  ArquetipoEnum,
  ClasseEnum,
  NivelAmeacaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaCriarDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaAcervo } from './acervo.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';

/**
 * Prova o acervo de fichas (m3-28, `/fichas`): lista todas as fichas do usuário (com e sem
 * campanha), navega pro guia de criação campanha-less em `/fichas/nova`, e move fichas entre o
 * acervo e uma campanha via o menu de ações de cada cartão.
 */
describe('FichaAcervo', () => {
  function fichaResumo(overrides: Partial<FichaResumoDto> = {}): FichaResumoDto {
    return {
      id: 1,
      campanhaId: null,
      campanhaNome: null,
      usuarioId: 7,
      nome: 'Kane',
      imagemUrl: null,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
      nivel: 2,
      vidaAtual: 34,
      vidaMaxima: 34,
      energiaAtual: 18,
      energiaMaxima: 18,
      morrendo: false,
      machucado: false,
      inconsciente: false,
      ...overrides,
    };
  }

  function criaturaResumo(overrides: Partial<FichaResumoDto> = {}): FichaResumoDto {
    return {
      id: 2,
      campanhaId: null,
      campanhaNome: null,
      usuarioId: 7,
      nome: 'A Estátua',
      imagemUrl: null,
      tipo: TipoFichaEnum.CRIATURA,
      na: NivelAmeacaEnum.MEDIA,
      vd: 30,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
      vidaAtual: 1050,
      vidaMaxima: 1050,
      energiaAtual: 0,
      energiaMaxima: 0,
      defesa: 30,
      morrendo: false,
      machucado: false,
      inconsciente: false,
      ...overrides,
    };
  }

  const campanhas: CampanhaResumoDto[] = [
    {
      id: 9,
      nome: 'Operação Alfa',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
      totalMembros: 1,
      totalFichas: 1,
      temFichaCritica: false,
      fichaCriticaNome: null,
      minhaFichaResumo: null,
      codigoConvite: 'ALFA1234',
      alteradoEm: '2026-07-29T01:48:01.082Z',
    },
  ];

  function montar(
    opcoes: {
      fichas?: FichaResumoDto[];
      campanhas?: CampanhaResumoDto[];
      confirmarResultado?: boolean;
    } = {},
  ) {
    const fichaService = {
      listarMinhasFichas: vi.fn(() => of(opcoes.fichas ?? [fichaResumo()])),
      criarFicha: vi.fn((dto: FichaCriarDto) =>
        of({ id: 5, campanhaId: null, usuarioId: 7, nome: dto.nome, dados: dto.dados }),
      ),
      atribuirCampanha: vi.fn(() => of({ id: 1, campanhaId: 9 })),
      duplicarFicha: vi.fn(() =>
        of({ id: 99, campanhaId: null, usuarioId: 7, nome: 'Kane (cópia)', dados: {} }),
      ),
      excluirFicha: vi.fn(() => of(undefined)),
    };
    const campanhaService = {
      listarCampanhas: vi.fn(() => of(opcoes.campanhas ?? campanhas)),
    };
    const confirmacaoService = {
      confirmar: vi.fn(() => Promise.resolve(opcoes.confirmarResultado ?? true)),
    };

    TestBed.configureTestingModule({
      imports: [FichaAcervo],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: ConfirmacaoService, useValue: confirmacaoService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(FichaAcervo);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      fichaService,
      campanhaService,
      confirmacaoService,
      navegar,
    };
  }

  it('carrega e lista as fichas do acervo', () => {
    const { raiz, fichaService, campanhaService } = montar();

    expect(fichaService.listarMinhasFichas).toHaveBeenCalled();
    expect(campanhaService.listarCampanhas).toHaveBeenCalled();
    expect(raiz.querySelectorAll('.acervo__cartao')).toHaveLength(1);
    expect(raiz.textContent).toContain('Kane');
  });

  it('mostra o chip "Sem campanha" para uma ficha solta', () => {
    const { raiz } = montar({ fichas: [fichaResumo({ campanhaId: null, campanhaNome: null })] });

    expect(raiz.querySelector('.acervo__chip')?.textContent).toContain('Sem campanha');
  });

  it('mostra o chip com o nome da campanha para uma ficha atribuída', () => {
    const { raiz } = montar({
      fichas: [fichaResumo({ campanhaId: 9, campanhaNome: 'Operação Alfa' })],
    });

    expect(raiz.querySelector('.acervo__chip--campanha')?.textContent).toContain('Operação Alfa');
  });

  it('exibe o estado vazio quando não há fichas', () => {
    const { raiz } = montar({ fichas: [] });

    expect(raiz.textContent).toContain('Nenhuma ficha ainda');
    expect(raiz.querySelectorAll('.acervo__cartao')).toHaveLength(0);
  });

  it('o link do cartão aponta para /fichas/:id', () => {
    const { raiz } = montar({ fichas: [fichaResumo({ id: 42 })] });

    expect(raiz.querySelector('.acervo__cartao-link')?.getAttribute('href')).toBe('/fichas/42');
  });

  it('"Criar ficha" navega pro guia de criação campanha-less, sem criar de imediato', () => {
    const { raiz, fichaService, navegar } = montar();
    const botaoCriar = Array.from(raiz.querySelectorAll('button')).find((botao) =>
      botao.textContent?.includes('Criar ficha'),
    ) as HTMLButtonElement;

    botaoCriar.click();

    expect(navegar).toHaveBeenCalledWith(['/fichas', 'nova']);
    expect(fichaService.criarFicha).not.toHaveBeenCalled();
  });

  it('mostra o menu de ações mesmo sem campanhas nem ficha atribuída (duplicar/excluir sempre disponíveis)', () => {
    const { raiz } = montar({ fichas: [fichaResumo({ campanhaId: null })], campanhas: [] });

    expect(raiz.querySelector('.acervo__menu-botao')).not.toBeNull();
  });

  it('abre o menu e a dialog de atribuição, chamando atribuirCampanha com a campanha escolhida', () => {
    const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1, campanhaId: null })] });

    const botaoMenu = raiz.querySelector('.acervo__menu-botao') as HTMLButtonElement;
    botaoMenu.click();
    fixture.detectChanges();

    const itemAtribuir = Array.from(raiz.querySelectorAll('.acervo__menu-item')).find((botao) =>
      botao.textContent?.includes('Atribuir a campanha'),
    ) as HTMLButtonElement;
    itemAtribuir.click();
    fixture.detectChanges();

    expect(raiz.querySelector('app-modal')).not.toBeNull();

    const botaoConfirmar = Array.from(raiz.querySelectorAll('.dialogo__acao')).find((botao) =>
      botao.textContent?.includes('Confirmar'),
    ) as HTMLButtonElement;
    botaoConfirmar.click();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(1, 9);
  });

  it('remove a ficha da campanha diretamente pelo menu, sem dialog', () => {
    const { fixture, raiz, fichaService } = montar({
      fichas: [fichaResumo({ id: 1, campanhaId: 9, campanhaNome: 'Operação Alfa' })],
    });

    const botaoMenu = raiz.querySelector('.acervo__menu-botao') as HTMLButtonElement;
    botaoMenu.click();
    fixture.detectChanges();

    const itemRemover = Array.from(raiz.querySelectorAll('.acervo__menu-item')).find((botao) =>
      botao.textContent?.includes('Remover da campanha'),
    ) as HTMLButtonElement;
    itemRemover.click();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(1, null);
    expect(raiz.querySelector('app-modal')).toBeNull();
    expect(raiz.querySelector('.acervo__chip--campanha')).toBeNull();
  });

  function abrirMenuFicha(raiz: HTMLElement, fixture: { detectChanges(): void }) {
    (raiz.querySelector('.acervo__menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function clicarItemMenu(raiz: HTMLElement, fixture: { detectChanges(): void }, texto: string) {
    const item = Array.from(raiz.querySelectorAll('.acervo__menu-item')).find((botao) =>
      botao.textContent?.includes(texto),
    ) as HTMLButtonElement;
    item.click();
    fixture.detectChanges();
  }

  describe('duplicar (m3-52, replicado do painel da campanha)', () => {
    it('abre a dialog de confirmação com o nome da ficha', () => {
      const { fixture, raiz } = montar({ fichas: [fichaResumo({ id: 1, nome: 'Kane' })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Duplicar ficha');

      const dialog = raiz.querySelector('app-modal');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Deseja mesmo duplicar a ficha "Kane"');
    });

    it('cancelar fecha a dialog sem chamar o serviço', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1 })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Duplicar ficha');

      (raiz.querySelector('.modal__fechar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-modal')).toBeNull();
      expect(fichaService.duplicarFicha).not.toHaveBeenCalled();
    });

    it('confirmar chama FichaService.duplicarFicha e recarrega o acervo', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1 })] });
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(1);
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Duplicar ficha');

      (raiz.querySelector('app-modal .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.duplicarFicha).toHaveBeenCalledWith(1);
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(2);
      expect(raiz.querySelector('app-modal')).toBeNull();
    });
  });

  describe('excluir (m3-52 · ui-15, via ConfirmacaoService)', () => {
    it('pede confirmação com o nome da ficha antes de excluir', () => {
      const { fixture, raiz, fichaService, confirmacaoService } = montar({
        fichas: [fichaResumo({ id: 1, nome: 'Kane' })],
      });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');

      expect(confirmacaoService.confirmar).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Excluir ficha', entidade: 'Kane' }),
      );
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();
    });

    it('cancelar (promessa resolve false) não chama o serviço', async () => {
      const { fixture, raiz, fichaService } = montar({
        fichas: [fichaResumo({ id: 1 })],
        confirmarResultado: false,
      });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fichaService.excluirFicha).not.toHaveBeenCalled();
    });

    it('confirmar (promessa resolve true) chama FichaService.excluirFicha e remove o cartão na hora, sem refetch', async () => {
      const { fixture, raiz, fichaService } = montar({
        fichas: [fichaResumo({ id: 1, nome: 'Kane' })],
      });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fichaService.excluirFicha).toHaveBeenCalledWith(1);
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(1);
      expect(raiz.textContent).not.toContain('Kane');
    });
  });

  describe('separação por tipo (m4-11)', () => {
    it('retrocompat: ficha sem `tipo` é listada no bloco Agentes, sem erro', () => {
      const { raiz } = montar({ fichas: [fichaResumo({ tipo: undefined })] });

      const titulos = Array.from(raiz.querySelectorAll('.acervo__secao-titulo')).map((el) => el.textContent);
      expect(titulos).toEqual(['Agentes']);
      expect(raiz.querySelector('.acervo__secao-contagem')?.textContent).toBe('1');
    });

    it('em "Todos", separa agentes e criaturas em blocos com cabeçalho e contagem próprios', () => {
      const { raiz } = montar({ fichas: [fichaResumo(), criaturaResumo()] });

      const titulos = Array.from(raiz.querySelectorAll('.acervo__secao-titulo')).map((el) => el.textContent);
      expect(titulos).toEqual(['Agentes', 'Criaturas']);
      const contagens = Array.from(raiz.querySelectorAll('.acervo__secao-contagem')).map((el) => el.textContent);
      expect(contagens).toEqual(['1', '1']);
    });

    it('em "Todos", omite o bloco de um tipo sem ficha nenhuma', () => {
      const { raiz } = montar({ fichas: [fichaResumo()] });

      const titulos = Array.from(raiz.querySelectorAll('.acervo__secao-titulo')).map((el) => el.textContent);
      expect(titulos).toEqual(['Agentes']);
    });

    it('filtrar por Criaturas mostra só aquele bloco, mesmo vazio (com estado vazio próprio)', () => {
      const { fixture, raiz } = montar({ fichas: [fichaResumo()] });

      const select = raiz.querySelector('.acervo__select-filtro') as HTMLSelectElement;
      select.value = TipoFichaEnum.CRIATURA;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const titulos = Array.from(raiz.querySelectorAll('.acervo__secao-titulo')).map((el) => el.textContent);
      expect(titulos).toEqual(['Criaturas']);
      expect(raiz.textContent).toContain('Nenhuma criatura ainda.');
      expect(raiz.querySelectorAll('.acervo__cartao')).toHaveLength(0);
    });

    it('card de criatura mostra Ameaça/NA/VD/Vida/Defesa e o link aponta pra /fichas/criatura/:id', () => {
      const { raiz } = montar({ fichas: [criaturaResumo({ id: 2 })] });

      const link = raiz.querySelector('.acervo__cartao-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/fichas/criatura/2');
      expect(raiz.textContent).toContain('Ameaça');
      expect(raiz.textContent).toContain('NA Média');
      expect(raiz.textContent).toContain('VD 30');
      expect(raiz.textContent).toContain('Vida 1050/1050');
      expect(raiz.textContent).toContain('Defesa 30');
      // Card de criatura não mostra meta de agente (classe/nível/patente/energia).
      expect(raiz.textContent).not.toContain('Energia');
    });

    it('"Criar criatura" só aparece para quem é mestre de alguma campanha', () => {
      const { raiz } = montar({ campanhas });
      const botaoCriarCriatura = Array.from(raiz.querySelectorAll('button')).find((botao) =>
        botao.textContent?.includes('Criar criatura'),
      );
      expect(botaoCriarCriatura).not.toBeUndefined();
    });

    it('"Criar criatura" não aparece para quem não é mestre de campanha nenhuma', () => {
      const campanhasSoJogador: CampanhaResumoDto[] = [
        { ...campanhas[0], papel: TipoCampanhaMembroPapelEnum.JOGADOR },
      ];
      const { raiz } = montar({ campanhas: campanhasSoJogador });

      const botaoCriarCriatura = Array.from(raiz.querySelectorAll('button')).find((botao) =>
        botao.textContent?.includes('Criar criatura'),
      );
      expect(botaoCriarCriatura).toBeUndefined();
    });

    it('"Criar criatura" navega pro guia de criação solta em /fichas/criatura/nova', () => {
      const { raiz, navegar } = montar({ campanhas });
      const botaoCriarCriatura = Array.from(raiz.querySelectorAll('button')).find((botao) =>
        botao.textContent?.includes('Criar criatura'),
      ) as HTMLButtonElement;

      botaoCriarCriatura.click();

      expect(navegar).toHaveBeenCalledWith(['/fichas', 'criatura', 'nova']);
    });

    it('atribuir uma criatura lista só campanhas onde o usuário é mestre', () => {
      const campanhasMistas: CampanhaResumoDto[] = [
        campanhas[0],
        { ...campanhas[0], id: 10, nome: 'Operação Beta', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
      ];
      const { fixture, raiz } = montar({
        fichas: [criaturaResumo({ id: 2, campanhaId: null })],
        campanhas: campanhasMistas,
      });

      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Atribuir a campanha');

      const opcoes = Array.from(raiz.querySelectorAll('app-modal select option')).map((el) => el.textContent);
      expect(opcoes).toEqual(['Operação Alfa']);
    });
  });
});
