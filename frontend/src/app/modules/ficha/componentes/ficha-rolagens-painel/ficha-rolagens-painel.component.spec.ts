import { TestBed } from '@angular/core/testing';

import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';
import { FichaRolagensPainel } from './ficha-rolagens-painel.component';

/**
 * Prova que `oculto()` esconde o painel inteiro — não só o `<app-ficha-rolagens>` de dentro. Achado
 * ao vivo pelo autor: o botão "Rolagem oculta" (topo do template, irmão de `<app-ficha-rolagens>`)
 * ficava fora do tratamento `--oculto` e sobrava visível/ocupando espaço em toda aba de Status que
 * não fosse Rolagens (`FichaVisualizacao`/`FichaCampanhaCard` mantêm o painel sempre montado,
 * alternando só `oculto`, em vez de destruir/recriar por `@if`).
 */
describe('FichaRolagensPainel', () => {
  const dados: FichaJogadorDadosDto = {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: ArquetipoEnum.MERCENARIO,
    nivel: 3,
    prestigio: 1,
    atributos: {
      destreza: 2,
      forca: 3,
      luta: 2,
      pontaria: 1,
      vigor: 4,
      intelecto: 1,
      medicina: 1,
      sentidos: 2,
      social: 1,
      vontade: 2,
    },
    maestria: null,
    estado: { vidaAtual: 5, energiaAtual: 4, sequelas: [], traumas: [], lesoes: [] },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
  };

  function montar(oculto: boolean) {
    TestBed.configureTestingModule({
      imports: [FichaRolagensPainel],
      providers: [FichaRolagemRegistroService],
    });
    const fixture = TestBed.createComponent(FichaRolagensPainel);
    fixture.componentRef.setInput('dados', dados);
    fixture.componentRef.setInput('podeRolar', true);
    fixture.componentRef.setInput('oculto', oculto);
    fixture.detectChanges();
    return fixture;
  }

  it('aba ativa (oculto=false): botão "Rolagem oculta" visível, raiz sem a classe --oculto', () => {
    const fixture = montar(false);
    const raiz = fixture.nativeElement.querySelector('.ficha-rolagens-painel');
    expect(raiz.classList.contains('ficha-rolagens-painel--oculto')).toBe(false);
    expect(fixture.nativeElement.querySelector('.ficha-rolagem-oculta')).not.toBeNull();
  });

  it('usa o mesmo botão secundário preenchido do painel de rolagens do mestre', () => {
    const fixture = montar(false);
    const botao = fixture.nativeElement.querySelector('.ficha-rolagem-oculta') as HTMLButtonElement;

    expect(botao.classList.contains('botao--secundario')).toBe(true);
    expect(botao.classList.contains('botao--estilo-preenchido')).toBe(true);
    expect(botao.classList.contains('botao--pequeno')).toBe(true);
  });

  it('aba inativa (oculto=true): a raiz do painel inteiro ganha a classe --oculto, não só o editor de dentro', () => {
    const fixture = montar(true);
    const raiz = fixture.nativeElement.querySelector('.ficha-rolagens-painel');
    expect(raiz.classList.contains('ficha-rolagens-painel--oculto')).toBe(true);
    // O botão continua no DOM (mesma decisão de "esconder sem desmontar" do `.ficha-rol--oculto`
    // de FichaRolagens), mas agora dentro da raiz escondida — não mais um irmão solto e visível.
    expect(raiz.querySelector('.ficha-rolagem-oculta')).not.toBeNull();
  });
});
