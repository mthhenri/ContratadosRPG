import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';

import { ClasseEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { FichaAcessoRevogadoDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { FichaService } from '../../ficha.service';
import { RegrasConsultaService } from '../../../regras/regras-consulta.service';
import { FichaFlutuante } from './ficha-flutuante.component';
import type { FichaFlutuanteAlvo } from './ficha-flutuante.model';

/**
 * Prova a "casca" da janela: abrir/minimizar/reabrir/fechar, e principalmente a troca de ficha —
 * que precisa recriar `FichaFlutuanteConteudo` (e os `FichaEdicaoService`/`FichaEdicaoCriaturaService`
 * dele) em vez de só trocar o `[alvo]` da mesma instância. Ver o comentário de `abrir()`.
 */
describe('FichaFlutuante', () => {
  const fichaJogador = {
    id: 10,
    campanhaId: 1,
    usuarioId: 7,
    nome: 'K. Amaral',
    cor: '#4a9d6b',
    imagemUrl: null,
    imagemFoco: null,
    oculta: false,
    dados: {
      classe: ClasseEnum.COMBATENTE,
      nivel: 2,
      atributos: {
        destreza: 4, forca: 2, luta: 2, pontaria: 2, vigor: 2,
        intelecto: 2, medicina: 0, sentidos: 2, social: 0, vontade: 2,
      },
      estado: { vidaAtual: 20, energiaAtual: 10, lesoes: [] },
      inventario: { itens: [], amplificadores: [] },
      habilidades: [],
      rolagens: [],
      identidade: { personalidade: null, origem: null },
    },
  } as unknown as FichaRecuperadaDto;

  function montar(ehMestre = true) {
    // `app-painel-flutuante` persiste posição/minimizado em `localStorage` por `[id]`
    // ("ficha-flutuante") — sem isso, um teste anterior que minimiza vazaria o estado para o
    // próximo (P-058).
    localStorage.clear();
    const recuperarFicha = vi.fn(() => of(fichaJogador));
    const acessoRevogado$ = new Subject<FichaAcessoRevogadoDto>();
    const notificar = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: FichaService, useValue: { recuperarFicha } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaFicha: vi.fn(),
            sairSalaFicha: vi.fn(),
            acessoRevogado$: acessoRevogado$.asObservable(),
          },
        },
        { provide: NotificacaoService, useValue: { notificar } },
        { provide: SessaoService, useValue: { usuario: () => ({ id: 7 }), autenticado: () => false } },
      ],
    });
    const fixture = TestBed.createComponent(FichaFlutuante);
    fixture.componentRef.setInput('ehMestre', ehMestre);
    fixture.detectChanges();
    return { fixture, recuperarFicha, acessoRevogado$, notificar };
  }

  const alvoA: FichaFlutuanteAlvo = { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 };
  const alvoB: FichaFlutuanteAlvo = { fichaId: 11, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 };

  it('fecha e avisa quando a leitura por concessão é revogada ou suspensa por ocultação', () => {
    const { fixture, acessoRevogado$, notificar } = montar(false);
    const alvoColega: FichaFlutuanteAlvo = { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 3 };
    fixture.componentInstance.abrir(alvoColega);
    fixture.detectChanges();
    const janela = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela');

    acessoRevogado$.next({ fichaId: 10, usuarioId: 99 });
    acessoRevogado$.next({ fichaId: 11, usuarioId: 7 });
    fixture.detectChanges();
    expect(janela()).not.toBeNull();

    acessoRevogado$.next({ fichaId: 10, usuarioId: 7 });
    fixture.detectChanges();

    expect(janela()).toBeNull();
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ resumo: 'Acesso revogado' }));
  });

  it('o mestre nunca é fechado pelo evento de revogação', () => {
    const { fixture, acessoRevogado$, notificar } = montar(true);
    fixture.componentInstance.abrir({ fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 3 });
    fixture.detectChanges();
    acessoRevogado$.next({ fichaId: 10, usuarioId: 7 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela')).not.toBeNull();
    expect(notificar).not.toHaveBeenCalled();
  });

  it('o dono da ficha aberta nunca é fechado pelo evento de revogação', () => {
    const { fixture, acessoRevogado$, notificar } = montar(false);
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();
    acessoRevogado$.next({ fichaId: 10, usuarioId: 7 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela')).not.toBeNull();
    expect(notificar).not.toHaveBeenCalled();
  });

  it('fica fechada até `abrir()` ser chamado', () => {
    const { fixture } = montar();
    expect((fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela')).toBeNull();
  });

  it('`abrir()` mostra a janela com o conteúdo do alvo', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.painel-flutuante__janela')).not.toBeNull();
    expect(elemento.querySelector('app-ficha-flutuante-conteudo')).not.toBeNull();
  });

  it('abre a consulta global de Regras mantendo a ficha aberta', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    elemento.querySelector<HTMLButtonElement>('[aria-label="Abrir Regras"]')!.click();
    expect(TestBed.inject(RegrasConsultaService).aberto()).toBe(true);
    expect(elemento.querySelector('.painel-flutuante__janela')).not.toBeNull();
    expect(elemento.querySelector('app-regras-flutuante')).toBeNull();
  });

  it('fecha o alvo revogado mesmo durante a troca diferida de ficha', () => {
    const { fixture } = montar(false);
    vi.useFakeTimers();
    try {
      fixture.componentInstance.abrir(alvoA);
      fixture.componentInstance.abrir(alvoB);
      fixture.componentInstance.fecharSeAlvo(11);
      vi.runAllTimers();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela'))
        .toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('abre a ficha do mestre na geometria ampla do desktop', () => {
    const larguraOriginal = window.innerWidth;
    const alturaOriginal = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
      const { fixture } = montar();

      fixture.componentInstance.abrir(alvoA);
      fixture.detectChanges();

      const janela = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
        '.painel-flutuante__janela',
      );
      expect(janela?.style.width).toBe('1100px');
      expect(janela?.style.height).toBe('600px');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: larguraOriginal });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: alturaOriginal });
    }
  });

  it('o título é "Ficha · {nome}" da ficha carregada', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__titulo-grupo h2')?.textContent?.trim(),
    ).toBe('Ficha · K. Amaral');
  });

  it('mantém maximizar com a mesma geometria de minimizar e fechar', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    const minimizar = elemento.querySelector<HTMLElement>(
      '[aria-label="Minimizar Ficha · K. Amaral"]',
    );
    const maximizar = elemento.querySelector<HTMLElement>('[aria-label="Maximizar ficha"]');
    const fechar = elemento.querySelector<HTMLElement>('[aria-label="Fechar Ficha · K. Amaral"]');

    expect(maximizar?.classList).not.toContain('ficha-flutuante__acao-janela');
    expect(maximizar?.classList).toContain('botao-icone--compacto');
    expect(getComputedStyle(maximizar!).width).toBe(getComputedStyle(minimizar!).width);
    expect(getComputedStyle(maximizar!).height).toBe(getComputedStyle(minimizar!).height);
    expect(getComputedStyle(maximizar!).width).toBe(getComputedStyle(fechar!).width);
    expect(getComputedStyle(maximizar!).height).toBe(getComputedStyle(fechar!).height);
  });

  it('minimizar esconde a janela e mostra o gatilho; reabrir desfaz', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    elemento
      .querySelector<HTMLButtonElement>('[aria-label="Minimizar Ficha · K. Amaral"]')
      ?.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.painel-flutuante__janela')?.hasAttribute('hidden')).toBe(true);
    expect(elemento.querySelector('.ficha-flutuante__gatilho')).not.toBeNull();

    elemento.querySelector<HTMLButtonElement>('.ficha-flutuante__gatilho')?.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.painel-flutuante__janela')?.hasAttribute('hidden')).toBe(false);
    expect(elemento.querySelector('.ficha-flutuante__gatilho')).toBeNull();
  });

  it('fechar remove a janela por completo', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Fechar Ficha · K. Amaral"]')
      ?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.painel-flutuante__janela')).toBeNull();
  });

  it('reabrir a mesma ficha não refaz a busca', () => {
    const { fixture, recuperarFicha } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();
    expect(recuperarFicha).toHaveBeenCalledTimes(1);

    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();
    expect(recuperarFicha).toHaveBeenCalledTimes(1);
  });

  it('abrir uma ficha diferente recria o conteúdo e busca de novo', async () => {
    const { fixture, recuperarFicha } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();
    expect(recuperarFicha).toHaveBeenCalledWith(10);

    fixture.componentInstance.abrir(alvoB);
    fixture.detectChanges();
    // A troca é assíncrona (força a recriação do conteúdo — ver comentário de `abrir()`).
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(recuperarFicha).toHaveBeenCalledWith(11);
    expect(recuperarFicha).toHaveBeenCalledTimes(2);
  });
});
