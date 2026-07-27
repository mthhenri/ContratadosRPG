import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ArquetipoEnum, ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaCriarDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaAcervo } from './acervo.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';

/**
 * Prova o acervo de fichas (m3-28, `/fichas`): lista todas as fichas do usuário (com e sem
 * campanha), cria uma ficha solta pelo assistente reusado, e move fichas entre o acervo e uma
 * campanha via o menu de ações de cada cartão.
 */
describe('FichaAcervo', () => {
  function fichaResumo(overrides: Partial<FichaResumoDto> = {}): FichaResumoDto {
    return {
      id: 1,
      campanhaId: null,
      campanhaNome: null,
      usuarioId: 7,
      nome: 'Kane',
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
    { id: 9, nome: 'Operação Alfa', descricao: null, papel: TipoCampanhaMembroPapelEnum.MESTRE },
  ];

  function montar(opcoes: { fichas?: FichaResumoDto[]; campanhas?: CampanhaResumoDto[] } = {}) {
    const fichaService = {
      listarMinhasFichas: vi.fn(() => of(opcoes.fichas ?? [fichaResumo()])),
      criarFicha: vi.fn((dto: FichaCriarDto) =>
        of({ id: 5, campanhaId: null, usuarioId: 7, nome: dto.nome, dados: dto.dados }),
      ),
      atribuirCampanha: vi.fn(() => of({ id: 1, campanhaId: 9 })),
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

    const fixture = TestBed.createComponent(FichaAcervo);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, fichaService, campanhaService };
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

  it('abre o assistente e cria a ficha sem campanhaId', () => {
    const { fixture, raiz, fichaService } = montar();
    const botaoCriar = Array.from(raiz.querySelectorAll('button')).find((botao) =>
      botao.textContent?.includes('Criar ficha'),
    ) as HTMLButtonElement;
    botaoCriar.click();
    fixture.detectChanges();
    expect(raiz.querySelector('app-ficha-criar-dialog')).not.toBeNull();

    fixture.componentInstance['criarFicha']({
      opcoes: {
        nome: 'Novo agente',
        classe: ClasseEnum.COMBATENTE,
        arquetipo: null,
        nivel: 0,
        prestigio: 0,
        atributos: {
          destreza: 1,
          forca: 1,
          luta: 1,
          pontaria: 1,
          vigor: 1,
          intelecto: 1,
          medicina: 1,
          sentidos: 1,
          social: 1,
          vontade: 1,
        },
        maestria: null,
      },
    });

    expect(fichaService.criarFicha).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Novo agente' }),
    );
    const dtoEnviado = fichaService.criarFicha.mock.calls[0][0];
    expect(dtoEnviado).not.toHaveProperty('campanhaId');
  });

  it('não mostra o menu de ações quando não há campanhas nem a ficha está atribuída', () => {
    const { raiz } = montar({ fichas: [fichaResumo({ campanhaId: null })], campanhas: [] });

    expect(raiz.querySelector('.acervo__menu-botao')).toBeNull();
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
});
