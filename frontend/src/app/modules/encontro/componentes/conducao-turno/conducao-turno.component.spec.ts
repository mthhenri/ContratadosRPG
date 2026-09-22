import { TestBed } from '@angular/core/testing';

import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { ConducaoTurno } from './conducao-turno.component';

/**
 * Prova a barra de condução do mestre (`ui-37`): três leituras do mesmo bloco, sem regra de
 * iniciativa — só intenções emitidas e as condições de `disabled` que a tela sempre teve.
 */
describe('ConducaoTurno', () => {
  function montar(entradas: Record<string, unknown>) {
    const fixture = TestBed.createComponent(ConducaoTurno);
    fixture.componentRef.setInput('status', EncontroStatusEnum.ATIVO);
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      raiz,
      botao: (rotulo: string) =>
        Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
          (item) =>
            item.getAttribute('aria-label') === rotulo ||
            (item.textContent ?? '').replace(/\s+/g, ' ').trim() === rotulo,
        ),
    };
  }

  const texto = (raiz: HTMLElement): string =>
    (raiz.textContent ?? '').replace(/\s+/g, ' ').trim();

  describe('em combate', () => {
    it('acende a moldura e diz quem age e quantas ações restam', () => {
      const { raiz } = montar({ nomeDaVez: 'Marco "Aço" Kessler', acoesRestantes: 2 });

      expect(raiz.classList).toContain('conducao--acesa');
      expect(texto(raiz)).toContain('Age agora');
      expect(texto(raiz)).toContain('Marco "Aço" Kessler · 2 ações restantes');
    });

    it('usa o singular com uma ação só', () => {
      const { raiz } = montar({ nomeDaVez: 'Íris', acoesRestantes: 1 });

      expect(texto(raiz)).toContain('· 1 ação restante');
    });

    it('emite voltar, avançar e encerrar', () => {
      const { fixture, botao } = montar({ nomeDaVez: 'Íris', acoesRestantes: 1 });
      const voltar = vi.fn();
      const avancar = vi.fn();
      const encerrar = vi.fn();
      fixture.componentInstance.voltar.subscribe(voltar);
      fixture.componentInstance.avancar.subscribe(avancar);
      fixture.componentInstance.encerrar.subscribe(encerrar);

      botao('Voltar ao turno anterior')?.click();
      botao('Passar ao próximo turno')?.click();
      botao('Encerrar')?.click();

      expect(voltar).toHaveBeenCalledTimes(1);
      expect(avancar).toHaveBeenCalledTimes(1);
      expect(encerrar).toHaveBeenCalledTimes(1);
    });

    it('trava os três botões com uma escrita em voo', () => {
      const { botao } = montar({ nomeDaVez: 'Íris', acoesRestantes: 1, emOperacao: true });

      expect(botao('Voltar ao turno anterior')?.disabled).toBe(true);
      expect(botao('Passar ao próximo turno')?.disabled).toBe(true);
      expect(botao('Encerrar')?.disabled).toBe(true);
    });

    it('não oferece as ações de montagem', () => {
      const { botao } = montar({ nomeDaVez: 'Íris' });

      expect(botao('Pedir iniciativa')).toBeUndefined();
      expect(botao('Iniciar combate')).toBeUndefined();
    });
  });

  describe('em montagem', () => {
    const emMontagem = { status: EncontroStatusEnum.MONTAGEM };

    it('não acende a moldura e mostra o estado de espera', () => {
      const { raiz, botao } = montar({ ...emMontagem, temCombatentes: true });

      expect(raiz.classList).not.toContain('conducao--acesa');
      expect(texto(raiz)).toContain('Aguardando');
      expect(texto(raiz)).toContain('Combate ainda não iniciado');
      expect(botao('Passar ao próximo turno')).toBeUndefined();
      expect(botao('Encerrar')).toBeUndefined();
    });

    it('sem combatentes bloqueia Pedir e Iniciar', () => {
      const { botao } = montar({ ...emMontagem, temCombatentes: false });

      expect(botao('Pedir iniciativa')?.disabled).toBe(true);
      expect(botao('Iniciar combate')?.disabled).toBe(true);
    });

    it('com iniciativa faltando bloqueia Iniciar e libera Rolar', () => {
      const { botao } = montar({ ...emMontagem, temCombatentes: true, faltamIniciativas: true });

      expect(botao('Iniciar combate')?.disabled).toBe(true);
      expect(botao('Rolar iniciativas')?.disabled).toBe(false);
      expect(botao('Pedir iniciativa')?.disabled).toBe(false);
    });

    it('com todos na ordem libera Iniciar e bloqueia Rolar (nada a rolar)', () => {
      const { botao } = montar({ ...emMontagem, temCombatentes: true, faltamIniciativas: false });

      expect(botao('Iniciar combate')?.disabled).toBe(false);
      expect(botao('Rolar iniciativas')?.disabled).toBe(true);
    });

    it('emite pedir, rolar e iniciar', () => {
      const { fixture, botao } = montar({
        ...emMontagem,
        temCombatentes: true,
        faltamIniciativas: false,
      });
      const pedir = vi.fn();
      const iniciar = vi.fn();
      fixture.componentInstance.pedirIniciativa.subscribe(pedir);
      fixture.componentInstance.iniciar.subscribe(iniciar);

      botao('Pedir iniciativa')?.click();
      botao('Iniciar combate')?.click();

      expect(pedir).toHaveBeenCalledTimes(1);
      expect(iniciar).toHaveBeenCalledTimes(1);
    });

    it('trava tudo com uma escrita em voo', () => {
      const { botao } = montar({
        ...emMontagem,
        temCombatentes: true,
        faltamIniciativas: true,
        emOperacao: true,
      });

      expect(botao('Pedir iniciativa')?.disabled).toBe(true);
      expect(botao('Rolar iniciativas')?.disabled).toBe(true);
      expect(botao('Iniciar combate')?.disabled).toBe(true);
    });
  });

  it('encerrado: só o estado, sem nenhum botão', () => {
    const { raiz } = montar({ status: EncontroStatusEnum.ENCERRADO });

    expect(raiz.querySelectorAll('button')).toHaveLength(0);
    expect(raiz.classList).not.toContain('conducao--acesa');
    expect(texto(raiz)).toContain('só leitura');
  });
});
