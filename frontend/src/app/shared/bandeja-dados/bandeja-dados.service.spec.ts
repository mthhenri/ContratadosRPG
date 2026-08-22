import { TestBed } from '@angular/core/testing';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';

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
      bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA });
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
      bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA });
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
      bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA });

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
      bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA });
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
    bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA });
    bandeja.limpar();
    expect(bandeja.entradas()).toHaveLength(0);
  });

  /**
   * Prévia efêmera do d20 (ajuste pós-m2-19, item 3 do detalhe da campanha): `semAutoSumir: true`
   * não agenda timer nenhum — sem isso a entrada some sozinha após `duracaoMs` mesmo com o mouse
   * ainda sobre o dadinho, contradizendo "só fecha quando eu tirar o mouse".
   */
  describe('semAutoSumir (prévia efêmera do d20)', () => {
    it('não agenda auto-sumir — a entrada continua depois de duracaoMs sem ninguém fechar', () => {
      vi.useFakeTimers();
      try {
        const bandeja = montar();
        bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA, semAutoSumir: true });

        vi.advanceTimersByTime(bandeja.duracaoMs + 1000);

        expect(bandeja.entradas()).toHaveLength(1);
        expect(bandeja.entradas()[0].saindo).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('retomar não reagenda um timer para uma entrada semAutoSumir', () => {
      vi.useFakeTimers();
      try {
        const bandeja = montar();
        bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA, semAutoSumir: true });
        const id = bandeja.entradas()[0].id;

        bandeja.pausar(id); // no-op — nunca houve timer
        bandeja.retomar(id); // não deveria criar um timer novo

        vi.advanceTimersByTime(bandeja.duracaoMs + 1000);
        expect(bandeja.entradas()).toHaveLength(1);
        expect(bandeja.entradas()[0].saindo).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('fechar encerra a prévia normalmente (mouseleave do d20)', () => {
      vi.useFakeTimers();
      try {
        const bandeja = montar();
        const id = bandeja.mostrar({ rotulo: 'Teste', resultado, visibilidade: RolagemVisibilidadeEnum.PUBLICA, semAutoSumir: true });

        bandeja.fechar(id);
        vi.advanceTimersByTime(280);

        expect(bandeja.entradas()).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
