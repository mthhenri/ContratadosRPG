import { TestBed } from '@angular/core/testing';

import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { AcaoJogador } from './acao-jogador.component';

/**
 * Prova o bloco de ação do jogador (`ui-39`): cada leitura do momento (rolar, aguardar, minha vez,
 * vez de outro, assistir, encerrado) diz o que deve e oferece só o botão que cabe — e o componente
 * só emite intenções, nunca chama serviço.
 */
describe('AcaoJogador', () => {
  type Entradas = Partial<{
    status: EncontroStatusEnum;
    assistindo: boolean;
    minhaVez: boolean;
    nomeDaVez: string | null;
    acoesRestantes: number;
    turnosAteAVez: number | null;
    podeRolar: boolean;
    chamado: boolean;
    minhaIniciativa: number | null;
    emOperacao: boolean;
  }>;

  const montar = (entradas: Entradas = {}) => {
    const fixture = TestBed.createComponent(AcaoJogador);
    const padrao: Entradas = { status: EncontroStatusEnum.ATIVO };
    for (const [nome, valor] of Object.entries({ ...padrao, ...entradas })) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const rolar = vi.fn();
    const avancar = vi.fn();
    fixture.componentInstance.rolar.subscribe(rolar);
    fixture.componentInstance.avancar.subscribe(avancar);
    return { fixture, elemento, rolar, avancar };
  };

  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('é uma região nomeada, para leitor de tela', () => {
    const { elemento } = montar();

    expect(elemento.getAttribute('role')).toBe('region');
    expect(elemento.getAttribute('aria-label')).toBe('Sua ação no combate');
  });

  describe('montagem', () => {
    const emMontagem = { status: EncontroStatusEnum.MONTAGEM };

    it('sem iniciativa: convida a rolar, com o botão primário, e emite ao clicar', () => {
      const { elemento, rolar } = montar({ ...emMontagem, podeRolar: true });
      const botao = elemento.querySelector<HTMLButtonElement>('button')!;

      expect(texto(elemento)).toContain('Sua iniciativa');
      expect(texto(botao)).toBe('Rolar iniciativa');
      expect(botao.classList).toContain('botao--primario');
      expect(botao.classList).toContain('botao--fluido');

      botao.click();
      expect(rolar).toHaveBeenCalledTimes(1);
    });

    it('só acende quando o mestre chamou a rolagem — e diz isso', () => {
      const quieto = montar({ ...emMontagem, podeRolar: true });
      expect(quieto.elemento.classList).not.toContain('acao--acesa');
      expect(texto(quieto.elemento)).not.toContain('O mestre chamou');
      TestBed.resetTestingModule();

      const chamado = montar({ ...emMontagem, podeRolar: true, chamado: true });
      expect(chamado.elemento.classList).toContain('acao--acesa');
      expect(texto(chamado.elemento)).toContain('O mestre chamou a rolagem');
    });

    it('trava o botão enquanto uma escrita está em voo', () => {
      const { elemento } = montar({ ...emMontagem, podeRolar: true, emOperacao: true });

      expect(elemento.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    });

    it('já com iniciativa: aguarda o mestre começar, sem botão', () => {
      const { elemento } = montar({ ...emMontagem, minhaIniciativa: 17 });

      expect(texto(elemento)).toContain('Aguardando');
      expect(texto(elemento)).toContain('Iniciativa 17');
      expect(texto(elemento)).toContain('Combate ainda não iniciado.');
      expect(elemento.querySelector('button')).toBeNull();
    });
  });

  describe('combate', () => {
    it('minha vez: acende, mostra nome e ações restantes e emite o avanço', () => {
      const { elemento, avancar } = montar({
        minhaVez: true,
        nomeDaVez: 'K. Amaral',
        acoesRestantes: 2,
      });
      const botao = elemento.querySelector<HTMLButtonElement>('button')!;

      expect(elemento.classList).toContain('acao--acesa');
      expect(texto(elemento)).toContain('Sua vez');
      expect(texto(elemento)).toContain('K. Amaral');
      expect(texto(elemento)).toContain('2 ações restantes');
      expect(texto(botao)).toBe('Avançar turno');
      expect(botao.classList).toContain('botao--primario');

      botao.click();
      expect(avancar).toHaveBeenCalledTimes(1);
    });

    it('uma ação restante no singular', () => {
      const { elemento } = montar({ minhaVez: true, nomeDaVez: 'K. Amaral', acoesRestantes: 1 });

      expect(texto(elemento)).toContain('1 ação restante');
      expect(texto(elemento)).not.toContain('ações restantes');
    });

    it('trava o avanço enquanto uma escrita está em voo', () => {
      const { elemento } = montar({ minhaVez: true, nomeDaVez: 'K. Amaral', emOperacao: true });

      expect(elemento.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    });

    it('vez de outro: quem age e quantos turnos faltam, sem botão nem moldura acesa', () => {
      const { elemento } = montar({ nomeDaVez: 'SCP-1471-A', turnosAteAVez: 3 });

      expect(texto(elemento)).toContain('Age agora');
      expect(texto(elemento)).toContain('SCP-1471-A');
      expect(texto(elemento)).toContain('Faltam 3 turnos para a sua vez.');
      expect(elemento.querySelector('button')).toBeNull();
      expect(elemento.classList).not.toContain('acao--acesa');
    });

    it('vez de outro: "Você é o próximo." quando falta um turno', () => {
      const { elemento } = montar({ nomeDaVez: 'SCP-1471-A', turnosAteAVez: 1 });

      expect(texto(elemento)).toContain('Você é o próximo.');
      expect(texto(elemento)).not.toContain('Faltam');
    });

    it('vez de outro: quem ainda não está na ordem entra na próxima rodada', () => {
      const { elemento } = montar({ nomeDaVez: 'SCP-1471-A', turnosAteAVez: null });

      expect(texto(elemento)).toContain('Você entra na ordem na próxima rodada.');
    });
  });

  describe('sem combatente do jogador em campo', () => {
    it('em combate: mostra quem age e diz que está assistindo', () => {
      const { elemento } = montar({ assistindo: true, nomeDaVez: 'SCP-1471-A' });

      expect(texto(elemento)).toContain('Age agora');
      expect(texto(elemento)).toContain('SCP-1471-A');
      expect(texto(elemento)).toContain('Você está assistindo a este combate.');
      expect(elemento.querySelector('button')).toBeNull();
    });

    it('em montagem: só diz que está assistindo', () => {
      const { elemento } = montar({ assistindo: true, status: EncontroStatusEnum.MONTAGEM });

      expect(texto(elemento)).toContain('Assistindo');
      expect(texto(elemento)).toContain('Você está assistindo a este combate.');
      expect(elemento.querySelector('button')).toBeNull();
    });
  });

  it('encerrado: só o estado — nunca um botão, mesmo com a vez ou o "pode rolar" ligados', () => {
    const { elemento } = montar({
      status: EncontroStatusEnum.ENCERRADO,
      minhaVez: true,
      podeRolar: true,
    });

    expect(texto(elemento)).toContain('Encerrado');
    expect(texto(elemento)).toContain('Só leitura.');
    expect(elemento.querySelector('button')).toBeNull();
    expect(elemento.classList).not.toContain('acao--acesa');
  });
});
