import { TestBed } from '@angular/core/testing';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import { EsquadraoCenaJogador } from './esquadrao-cena-jogador.component';

describe('EsquadraoCenaJogador', () => {
  const resumo = (id: number, usuarioId: number, nome: string) => ({
    id, usuarioId, nome, tipo: TipoFichaEnum.JOGADOR,
    imagemUrl: null, cor: null, classe: null, arquetipo: null, nivel: 1,
    vidaAtual: 12, vidaMaxima: 20, energiaAtual: 7, energiaMaxima: 10,
    morrendo: false, machucado: false, inconsciente: false,
  }) as unknown as FichaResumoDto;
  const membro = (usuarioId: number, nome: string, fichas: Array<{ id: number; acessoCompleto: boolean }>) => ({
    usuarioId, nome, papel: TipoCampanhaMembroPapelEnum.JOGADOR,
    fichas: fichas.map(({ id, acessoCompleto }) => ({
      id, acessoCompleto, nome: `Agente ${id}`, imagemUrl: null, cor: null,
      classe: null, arquetipo: null, morrendo: false, machucado: false, inconsciente: false,
    })),
  }) as unknown as CampanhaMembroResumoDto;

  const montar = (membros: CampanhaMembroResumoDto[], fichas: FichaResumoDto[]) => {
    TestBed.configureTestingModule({ imports: [EsquadraoCenaJogador] });
    const fixture = TestBed.createComponent(EsquadraoCenaJogador);
    fixture.componentRef.setInput('membros', membros);
    fixture.componentRef.setInput('fichas', fichas);
    fixture.componentRef.setInput('usuarioObservadorId', 7);
    fixture.detectChanges();
    return fixture;
  };

  it('inclui a própria ficha oculta no recorte e não cria cartão para colega oculto ou sem ficha', () => {
    const fixture = montar([
      membro(7, 'Bia', [{ id: 10, acessoCompleto: true }]),
      membro(8, 'Colega oculto', []), membro(9, 'Sem ficha', []),
    ], [resumo(10, 7, 'Própria'), resumo(11, 8, 'Oculta')]);
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Própria');
    expect(raiz.textContent).not.toContain('Colega oculto');
    expect(raiz.textContent).not.toContain('Oculta');
    expect(raiz.textContent).not.toContain('Sem ficha');
    expect(raiz.querySelector('button[aria-label="Ver ficha de Própria"]')).toBeNull();
  });

  it('não amplia acesso a partir do resumo: teaser não tem vitais nem botão', () => {
    const fixture = montar([membro(8, 'Ana', [{ id: 20, acessoCompleto: false }])],
      [resumo(20, 8, 'Ficha alheia')]);
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Agente 20');
    expect(raiz.textContent).not.toContain('Ficha alheia');
    expect(raiz.textContent).not.toContain('Vida 12');
    expect(raiz.querySelector('button[aria-label^="Ver ficha"]')).toBeNull();
  });

  it('abre somente a ficha alheia concedida, inclusive quando membro tem múltiplas fichas', () => {
    const fixture = montar([membro(8, 'Ana', [
      { id: 20, acessoCompleto: true }, { id: 21, acessoCompleto: false },
    ])], [resumo(20, 8, 'Acessível'), resumo(21, 8, 'Restrita')]);
    const abrir = vi.fn();
    fixture.componentInstance.abrirFicha.subscribe(abrir);
    const raiz = fixture.nativeElement as HTMLElement;
    raiz.querySelector<HTMLButtonElement>('button[aria-label="Ver ficha de Acessível"]')!.click();
    expect(abrir).toHaveBeenCalledWith(20);
    expect(raiz.querySelector('button[aria-label="Ver ficha de Restrita"]')).toBeNull();
    expect(raiz.textContent).toContain('Agente 21');
  });

  it('usa o estado vazio sem agentes', () => {
    const raiz = montar([], []).nativeElement as HTMLElement;
    expect(raiz.querySelector('app-estado-vazio')).not.toBeNull();
  });
});
