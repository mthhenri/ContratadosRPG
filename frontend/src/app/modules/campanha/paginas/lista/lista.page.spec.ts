import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaResumoDto } from '@contratados-rpg/shared/dtos/campanha';

import { CampanhaLista } from './lista.page';
import { CampanhaService } from '../../campanha.service';

/**
 * Prova o redesenho "painel de controle" da m2-18: a tira de estatísticas soma corretamente a
 * partir da lista já enriquecida pelo backend, a linha com ficha crítica ganha destaque e mostra
 * o nome dela, o jogador vê a própria ficha (Vida atual/máxima) e o mestre pode copiar o convite
 * direto na linha — tudo já vindo pronto do `CampanhaResumoDto` (o front só formata/soma, a
 * regra de visibilidade §14 é do backend).
 */
describe('CampanhaLista', () => {
  function campanha(sobrescritas: Partial<CampanhaResumoDto> = {}): CampanhaResumoDto {
    return {
      id: 1,
      nome: 'Contenção Alfa',
      descricao: null,
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
      totalMembros: 3,
      totalFichas: 5,
      temFichaCritica: false,
      fichaCriticaNome: null,
      minhaFichaResumo: null,
      codigoConvite: null,
      alteradoEm: new Date().toISOString(),
      ...sobrescritas,
    };
  }

  function montar(campanhas: CampanhaResumoDto[]) {
    const campanhaService = { listarCampanhas: vi.fn(() => of(campanhas)) };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });

    TestBed.configureTestingModule({
      imports: [CampanhaLista],
      providers: [provideRouter([]), { provide: CampanhaService, useValue: campanhaService }],
    });

    const fixture = TestBed.createComponent(CampanhaLista);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, campanhaService };
  }

  describe('tira de estatísticas (item 4)', () => {
    it('soma total de campanhas, quantas você mestra, fichas em campo e alertas', () => {
      const { raiz } = montar([
        campanha({ id: 1, papel: TipoCampanhaMembroPapelEnum.MESTRE, totalFichas: 4, temFichaCritica: true }),
        campanha({ id: 2, papel: TipoCampanhaMembroPapelEnum.JOGADOR, totalFichas: 3, temFichaCritica: false }),
        campanha({ id: 3, papel: TipoCampanhaMembroPapelEnum.MESTRE, totalFichas: 2, temFichaCritica: false }),
      ]);

      const valores = [...raiz.querySelectorAll('.stat__valor')].map((elemento) => elemento.textContent?.trim());
      expect(valores).toEqual(['3', '2', '9', '1']);
    });

    it('não mostra a tira enquanto a lista está vazia', () => {
      const { raiz } = montar([]);
      expect(raiz.querySelector('.campanhas__estatisticas')).toBeNull();
    });
  });

  describe('linha com ficha crítica (item 3)', () => {
    it('ganha a classe de destaque e mostra o nome da ficha crítica', () => {
      const { raiz } = montar([
        campanha({ id: 1, temFichaCritica: true, fichaCriticaNome: 'Kane' }),
      ]);

      const linha = raiz.querySelector('.campanhas__linha');
      expect(linha?.classList.contains('campanhas__linha--critico')).toBe(true);
      expect(raiz.querySelector('.campanhas__linha-alerta')?.textContent).toContain('Kane');
    });

    it('sem ficha crítica, a linha não ganha destaque', () => {
      const { raiz } = montar([campanha({ id: 1, temFichaCritica: false })]);
      expect(raiz.querySelector('.campanhas__linha--critico')).toBeNull();
    });
  });

  describe('resumo da própria ficha do jogador (item 2)', () => {
    it('mostra nome + Vida atual/máxima quando não há alerta', () => {
      const { raiz } = montar([
        campanha({
          id: 1,
          papel: TipoCampanhaMembroPapelEnum.JOGADOR,
          temFichaCritica: false,
          minhaFichaResumo: { nome: 'Vera', vidaAtual: 12, vidaMaxima: 30 },
        }),
      ]);

      expect(raiz.querySelector('.campanhas__linha-minha-ficha')?.textContent).toContain('Vera');
      expect(raiz.querySelector('.campanhas__linha-minha-ficha')?.textContent).toContain('Vida 12/30');
    });

    it('some quando há alerta de ficha crítica na campanha (alerta tem prioridade)', () => {
      const { raiz } = montar([
        campanha({
          id: 1,
          papel: TipoCampanhaMembroPapelEnum.JOGADOR,
          temFichaCritica: true,
          fichaCriticaNome: 'Zeta',
          minhaFichaResumo: { nome: 'Vera', vidaAtual: 12, vidaMaxima: 30 },
        }),
      ]);

      expect(raiz.querySelector('.campanhas__linha-minha-ficha')).toBeNull();
      expect(raiz.querySelector('.campanhas__linha-alerta')?.textContent).toContain('Zeta');
    });

    it('mestre nunca mostra "minha ficha" (o DTO já vem null)', () => {
      const { raiz } = montar([
        campanha({ id: 1, papel: TipoCampanhaMembroPapelEnum.MESTRE, minhaFichaResumo: null }),
      ]);
      expect(raiz.querySelector('.campanhas__linha-minha-ficha')).toBeNull();
    });
  });

  describe('contadores de membros/fichas (item 2)', () => {
    it('mostra "N membros" e "N fichas" na linha', () => {
      const { raiz } = montar([campanha({ id: 1, totalMembros: 4, totalFichas: 7 })]);
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).toContain('4 membros');
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).toContain('7 fichas');
    });

    it('usa singular quando é só 1', () => {
      const { raiz } = montar([campanha({ id: 1, totalMembros: 1, totalFichas: 1 })]);
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).toContain('1 membro');
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).toContain('1 ficha');
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).not.toContain('membros');
      expect(raiz.querySelector('.campanhas__linha-contadores')?.textContent).not.toContain('fichas');
    });
  });

  describe('convite copiável direto na linha (mestre — item 2)', () => {
    it('mostra o botão de copiar só quando mestre e com codigoConvite', () => {
      const { raiz } = montar([
        campanha({ id: 1, papel: TipoCampanhaMembroPapelEnum.MESTRE, codigoConvite: 'ABCD1234' }),
      ]);
      expect(raiz.querySelector('.campanhas__linha-copiar')).not.toBeNull();
    });

    it('jogador nunca vê o botão de copiar (codigoConvite vem null)', () => {
      const { raiz } = montar([
        campanha({ id: 1, papel: TipoCampanhaMembroPapelEnum.JOGADOR, codigoConvite: null }),
      ]);
      expect(raiz.querySelector('.campanhas__linha-copiar')).toBeNull();
    });

    it('clique copia o código pro clipboard e vira "copiado" por um instante', async () => {
      vi.useFakeTimers();
      try {
        const { fixture, raiz } = montar([
          campanha({ id: 1, papel: TipoCampanhaMembroPapelEnum.MESTRE, codigoConvite: 'ABCD1234' }),
        ]);
        const botao = raiz.querySelector('.campanhas__linha-copiar') as HTMLButtonElement;

        botao.click();
        await Promise.resolve();
        await Promise.resolve();
        fixture.detectChanges();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD1234');
        expect(botao.classList.contains('campanhas__linha-copiar--copiado')).toBe(true);

        vi.advanceTimersByTime(1500);
        fixture.detectChanges();
        expect(botao.classList.contains('campanhas__linha-copiar--copiado')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('estados de carregamento/vazio (preservados da m2-17)', () => {
    it('mostra o esqueleto enquanto o fetch está em voo, e some quando ele chega', () => {
      const listarCampanhas$ = new Subject<CampanhaResumoDto[]>();
      const campanhaService = { listarCampanhas: vi.fn(() => listarCampanhas$.asObservable()) };
      TestBed.configureTestingModule({
        imports: [CampanhaLista],
        providers: [provideRouter([]), { provide: CampanhaService, useValue: campanhaService }],
      });
      const fixture = TestBed.createComponent(CampanhaLista);
      const raiz = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      expect(raiz.querySelector('[role="status"]')).not.toBeNull();

      listarCampanhas$.next([campanha({ id: 1 })]);
      listarCampanhas$.complete();
      fixture.detectChanges();
      expect(raiz.querySelector('[role="status"]')).toBeNull();
    });

    it('mostra o estado vazio quando não há campanhas', () => {
      const { raiz } = montar([]);
      expect(raiz.querySelector('app-estado-vazio')).not.toBeNull();
    });
  });
});
