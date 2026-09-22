import { TestBed } from '@angular/core/testing';

import { AjusteDerivado, FichaReacoes } from './ficha-reacoes.component';
import type { InfoExtra } from '../../status-derivado';

/**
 * Prova o bloco "Reações" (I-029: extraído de `FichaVisualizacao`/`FichaCampanhaCard`, onde vivia
 * duplicado byte a byte) — edição no próprio lugar do override manual (Defesa/Esquiva/Bloqueio/
 * Contra-ataque), gated por `ajustavelAmplo`, com Contra-ataque tracejado sem a habilidade.
 */
describe('FichaReacoes', () => {
  const linhas: readonly InfoExtra[] = [
    { chave: 'defesa', rotulo: 'Defesa', display: '14', bruto: 14, tipo: 'numero' },
    { chave: 'esquiva', rotulo: 'Esquiva', display: '12', bruto: 12, tipo: 'numero' },
    { chave: 'bloqueio', rotulo: 'Bloqueio', display: '10', bruto: 10, tipo: 'numero' },
  ];
  const contraAtaque: InfoExtra = {
    chave: 'contraAtaque',
    rotulo: 'Contra-ataque',
    display: '16',
    bruto: 16,
    tipo: 'numero',
  };

  function montar(opts: {
    ajustavelAmplo?: boolean;
    temContraAtaque?: boolean;
    compacto?: boolean;
  } = {}) {
    TestBed.configureTestingModule({ imports: [FichaReacoes] });
    const fixture = TestBed.createComponent(FichaReacoes);
    fixture.componentRef.setInput('linhas', linhas);
    fixture.componentRef.setInput('contraAtaqueLinha', contraAtaque);
    fixture.componentRef.setInput('ajustavelAmplo', opts.ajustavelAmplo ?? true);
    fixture.componentRef.setInput('temContraAtaque', opts.temContraAtaque ?? true);
    fixture.componentRef.setInput('compacto', opts.compacto ?? false);
    fixture.detectChanges();
    const emitidos: AjusteDerivado[] = [];
    fixture.componentInstance.ajusteDerivado.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista Defesa/Esquiva/Bloqueio e Contra-ataque em leitura quando não ajustável', () => {
    const { raiz } = montar({ ajustavelAmplo: false });
    const valores = Array.from(raiz.querySelectorAll('.ficha-mini__valor')).map((n) => n.textContent?.trim());
    expect(valores).toEqual(['14', '12', '10', '16']);
    expect(raiz.querySelectorAll('app-valor-editavel')).toHaveLength(0);
  });

  it('Contra-ataque sem a habilidade vira placeholder tracejado, mesmo ajustável', () => {
    const { raiz } = montar({ temContraAtaque: false });
    const caixas = raiz.querySelectorAll('.ficha-mini');
    const contra = caixas[caixas.length - 1];
    expect(contra.classList.contains('ficha-mini--contra')).toBe(true);
    expect(contra.querySelector('.ficha-mini__valor')?.textContent?.trim()).toBe('—');
  });

  it('confirmar a digitação de uma linha emite o override (chave + valor)', () => {
    const { fixture, emitidos } = montar({ ajustavelAmplo: true });
    fixture.componentInstance['editarDerivado']('defesa');
    fixture.componentInstance['confirmarDerivado'](linhas[0], '18');
    expect(emitidos).toEqual([{ chave: 'defesa', valor: 18 }]);
  });

  it('confirmar sem mudar o valor não emite nada', () => {
    const { fixture, emitidos } = montar({ ajustavelAmplo: true });
    fixture.componentInstance['editarDerivado']('defesa');
    fixture.componentInstance['confirmarDerivado'](linhas[0], '14');
    expect(emitidos).toHaveLength(0);
  });

  it('cancelar a digitação (Escape) fecha o campo sem emitir', () => {
    const { fixture, emitidos } = montar({ ajustavelAmplo: true });
    fixture.componentInstance['editarDerivado']('defesa');
    fixture.componentInstance['cancelarDerivado']();
    expect(fixture.componentInstance['editandoDerivado']()).toBeNull();
    expect(emitidos).toHaveLength(0);
  });
});
