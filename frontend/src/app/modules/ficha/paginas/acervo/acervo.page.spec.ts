import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ArquetipoEnum, ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaCriarDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaAcervo } from './acervo.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';

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
      atualizadoEm: '2026-07-29T01:48:01.082Z',
    },
  ];

  function montar(opcoes: { fichas?: FichaResumoDto[]; campanhas?: CampanhaResumoDto[] } = {}) {
    const fichaService = {
      listarMinhasFichas: vi.fn(() => of(opcoes.fichas ?? [fichaResumo()])),
      criarFicha: vi.fn((dto: FichaCriarDto) =>
        of({ id: 5, campanhaId: null, usuarioId: 7, nome: dto.nome, dados: dto.dados }),
      ),
      atribuirCampanha: vi.fn(() => of({ id: 1, campanhaId: 9 })),
      duplicarFicha: vi.fn((id: number) =>
        of({ id: 99, campanhaId: null, usuarioId: 7, nome: 'Kane (cópia)', dados: {} }),
      ),
      excluirFicha: vi.fn(() => of(undefined)),
    };
    const campanhaService = {
      listarCampanhas: vi.fn(() => of(opcoes.campanhas ?? campanhas)),
    };

    TestBed.configureTestingModule({
      imports: [FichaAcervo],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(FichaAcervo);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, fichaService, campanhaService, navegar };
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

    expect(raiz.querySelector('.dialogo')).not.toBeNull();

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
    expect(raiz.querySelector('.dialogo')).toBeNull();
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

      const dialog = raiz.querySelector('.dialogo');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Deseja mesmo duplicar a ficha "Kane"');
    });

    it('cancelar fecha a dialog sem chamar o serviço', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1 })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Duplicar ficha');

      (raiz.querySelector('.dialogo__fundo') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.duplicarFicha).not.toHaveBeenCalled();
    });

    it('confirmar chama FichaService.duplicarFicha e recarrega o acervo', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1 })] });
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(1);
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Duplicar ficha');

      (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.duplicarFicha).toHaveBeenCalledWith(1);
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(2);
      expect(raiz.querySelector('.dialogo')).toBeNull();
    });
  });

  describe('excluir (m3-52, replicado da tela da ficha)', () => {
    it('abre a dialog de confirmação com o nome da ficha', () => {
      const { fixture, raiz } = montar({ fichas: [fichaResumo({ id: 1, nome: 'Kane' })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');

      const dialog = raiz.querySelector('.dialogo');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Excluir');
      expect(dialog?.textContent).toContain('Kane');
    });

    it('cancelar fecha a dialog sem chamar o serviço', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1 })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');

      (raiz.querySelector('.dialogo .botao--secundario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();
    });

    it('confirmar chama FichaService.excluirFicha e remove o cartão na hora, sem refetch', () => {
      const { fixture, raiz, fichaService } = montar({ fichas: [fichaResumo({ id: 1, nome: 'Kane' })] });
      abrirMenuFicha(raiz, fixture);
      clicarItemMenu(raiz, fixture, 'Excluir ficha');

      (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.excluirFicha).toHaveBeenCalledWith(1);
      expect(fichaService.listarMinhasFichas).toHaveBeenCalledTimes(1);
      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(raiz.textContent).not.toContain('Kane');
    });
  });
});
