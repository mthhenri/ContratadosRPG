import { TestBed } from '@angular/core/testing';

import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from './bandeja-dados.service';

/**
 * Prova a saída suave de uma entrada (m3-55): fechar (× ou fim do auto-sumir) não tira a entrada
 * do array na hora — marca `saindo` (dispara a transição de fade+colapso no SCSS) e só remove
 * depois. Sem isso, o array mudava na mesma tick da chamada e o layout "saltava" (bounce antigo);
 * o "×" nem passava pela transição (removia direto).
 */
describe('BandejaDadosService', () => {
  const resultado: ResultadoRolagemDto = {
    dados: [],
    atributos: [],
    constante: 0,
    total: 12,
  };

  function montar() {
    TestBed.resetTestingModule();
    return TestBed.inject(BandejaDadosService);
  }

  it('fechar marca a entrada como saindo e só a remove do array após a transição', () => {
    vi.useFakeTimers();
    try {
      const bandeja = montar();
      bandeja.mostrar({ rotulo: 'Teste', resultado });
      const id = bandeja.entradas()[0].id;

      bandeja.fechar(id);
      expect(bandeja.entradas()).toHaveLength(1);
      expect(bandeja.entradas()[0].saindo).toBe(true);

      vi.advanceTimersByTime(280);
      expect(bandeja.entradas()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fechar é idempotente — chamar de novo numa entrada já saindo não reinicia a transição', () => {
    vi.useFakeTimers();
    try {
      const bandeja = montar();
      bandeja.mostrar({ rotulo: 'Teste', resultado });
      const id = bandeja.entradas()[0].id;

      bandeja.fechar(id);
      vi.advanceTimersByTime(200);
      bandeja.fechar(id); // não deve reagendar mais 280ms a partir daqui
      vi.advanceTimersByTime(80);
      expect(bandeja.entradas()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('o fim do auto-sumir passa pela mesma transição de saída (não remove na hora)', () => {
    vi.useFakeTimers();
    try {
      const bandeja = montar();
      bandeja.mostrar({ rotulo: 'Teste', resultado });

      vi.advanceTimersByTime(7000); // duracaoMs — dispara o auto-sumir
      expect(bandeja.entradas()).toHaveLength(1);
      expect(bandeja.entradas()[0].saindo).toBe(true);

      vi.advanceTimersByTime(280);
      expect(bandeja.entradas()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pausar/retomar não afeta uma entrada que já está saindo', () => {
    vi.useFakeTimers();
    try {
      const bandeja = montar();
      bandeja.mostrar({ rotulo: 'Teste', resultado });
      const id = bandeja.entradas()[0].id;

      bandeja.fechar(id);
      bandeja.pausar(id);
      bandeja.retomar(id); // não deve reagendar o auto-sumir de 7s numa entrada saindo

      vi.advanceTimersByTime(280);
      expect(bandeja.entradas()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('limpar esvazia a bandeja sem transição', () => {
    const bandeja = montar();
    bandeja.mostrar({ rotulo: 'Teste', resultado });
    bandeja.limpar();
    expect(bandeja.entradas()).toHaveLength(0);
  });
});
