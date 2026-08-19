import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ClasseEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';
import type { FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../../ficha/ficha.service';
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

  function montar() {
    const recuperarFicha = vi.fn(() => of(fichaJogador));
    TestBed.configureTestingModule({
      providers: [
        { provide: FichaService, useValue: { recuperarFicha } },
        { provide: SessaoService, useValue: { usuario: () => ({ id: 7 }) } },
      ],
    });
    const fixture = TestBed.createComponent(FichaFlutuante);
    fixture.componentRef.setInput('ehMestre', true);
    fixture.detectChanges();
    return { fixture, recuperarFicha };
  }

  const alvoA: FichaFlutuanteAlvo = { fichaId: 10, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 };
  const alvoB: FichaFlutuanteAlvo = { fichaId: 11, tipo: TipoFichaEnum.JOGADOR, usuarioIdDono: 7 };

  it('fica fechada até `abrir()` ser chamado', () => {
    const { fixture } = montar();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ficha-flutuante__janela')).toBeNull();
  });

  it('`abrir()` mostra a janela com o conteúdo do alvo', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('.ficha-flutuante__janela')).not.toBeNull();
    expect(elemento.querySelector('app-ficha-flutuante-conteudo')).not.toBeNull();
  });

  it('minimizar esconde a janela e mostra o gatilho; reabrir desfaz', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    const elemento = fixture.nativeElement as HTMLElement;
    elemento.querySelector<HTMLButtonElement>('[aria-label="Minimizar ficha"]')?.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.ficha-flutuante__janela')?.hasAttribute('hidden')).toBe(true);
    expect(elemento.querySelector('.ficha-flutuante__gatilho')).not.toBeNull();

    elemento.querySelector<HTMLButtonElement>('.ficha-flutuante__gatilho')?.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.ficha-flutuante__janela')?.hasAttribute('hidden')).toBe(false);
    expect(elemento.querySelector('.ficha-flutuante__gatilho')).toBeNull();
  });

  it('fechar remove a janela por completo', () => {
    const { fixture } = montar();
    fixture.componentInstance.abrir(alvoA);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Fechar ficha"]')
      ?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.ficha-flutuante__janela')).toBeNull();
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
