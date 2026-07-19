import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import type { FichaAtributosDto, FichaComboDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaCombos } from './ficha-combos.component';

/**
 * Prova o editor + runner de Combos (m3-34): monta uma sequência ordenada de passos, cada um
 * **referenciando** um preset de rolagem existente (`FichaRolagemDto.nome`), e executa **um passo
 * por clique** — reusando `executarPassoPreset` (extraído de `FichaRolagens`), nenhuma regra de
 * dados no componente. Controlado: cada mutação emite a lista inteira por `combosMudou`.
 */
describe('FichaCombos', () => {
  const atributos: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 3,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 3,
  };

  const rolagens: readonly FichaRolagemDto[] = [
    { nome: 'Ataque', formula: '1d20+LUT' },
    { nome: 'Dano', formula: '2d6+FOR' },
  ];

  function montar(combos: readonly FichaComboDto[], editavel = true) {
    TestBed.configureTestingModule({ imports: [FichaCombos] });
    const fixture = TestBed.createComponent(FichaCombos);
    fixture.componentRef.setInput('combos', combos);
    fixture.componentRef.setInput('rolagens', rolagens);
    fixture.componentRef.setInput('atributos', atributos);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaComboDto[])[] = [];
    const energias: number[] = [];
    fixture.componentInstance.combosMudou.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.energiaGasta.subscribe((e) => energias.push(e));
    const bandeja = TestBed.inject(BandejaDadosService);
    const mostrar = vi.spyOn(bandeja, 'mostrar').mockImplementation(() => undefined);
    return {
      fixture,
      componentInstance: fixture.componentInstance,
      raiz: fixture.nativeElement as HTMLElement,
      emitidos,
      energias,
      mostrar,
    };
  }

  it('mostra "nenhum combo" quando a lista está vazia (fora da edição)', () => {
    const { raiz } = montar([]);
    expect(raiz.textContent).toContain('Nenhum combo salvo');
  });

  it('adiciona um combo com dois passos referenciando presets existentes', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].patchValue({ nome: 'Combo de abertura' });
    alvo.componentInstance['adicionarPasso']();
    alvo.componentInstance['adicionarPasso']();
    alvo.componentInstance['passos'].at(0).patchValue({ nome: 'Golpe', rolagemNome: 'Ataque' });
    alvo.componentInstance['passos'].at(1).patchValue({ nome: 'Ferida', rolagemNome: 'Dano' });
    alvo.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([
      { nome: 'Combo de abertura', passos: [{ nome: 'Golpe', rolagemNome: 'Ataque' }, { nome: 'Ferida', rolagemNome: 'Dano' }] },
    ]);
  });

  it('edita um combo existente, substituindo-o na mesma posição', () => {
    const existente: FichaComboDto = { nome: 'Original', passos: [{ nome: 'A', rolagemNome: 'Ataque' }] };
    const alvo = montar([existente]);
    alvo.componentInstance['editar'](0);
    alvo.componentInstance['form'].patchValue({ nome: 'Renomeado' });
    alvo.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toHaveLength(1);
    expect(alvo.emitidos[0][0].nome).toBe('Renomeado');
  });

  it('reordena passos com moverPasso', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].patchValue({ nome: 'Combo' });
    alvo.componentInstance['adicionarPasso']();
    alvo.componentInstance['adicionarPasso']();
    alvo.componentInstance['passos'].at(0).patchValue({ nome: 'Primeiro', rolagemNome: 'Ataque' });
    alvo.componentInstance['passos'].at(1).patchValue({ nome: 'Segundo', rolagemNome: 'Dano' });
    alvo.componentInstance['moverPasso'](1, -1);
    alvo.componentInstance['confirmar']();

    expect(alvo.emitidos[0][0].passos.map((p) => p.nome)).toEqual(['Segundo', 'Primeiro']);
  });

  it('remove um combo com confirmação inline', () => {
    const existente: FichaComboDto = { nome: 'Combo', passos: [] };
    const alvo = montar([existente]);
    alvo.componentInstance['removerPedido'](0);
    alvo.componentInstance['confirmarRemocao'](0);
    expect(alvo.emitidos[0]).toEqual([]);
  });

  describe('runner — executa um passo por clique', () => {
    const combo: FichaComboDto = {
      nome: 'Combo de abertura',
      passos: [
        { nome: 'Golpe', rolagemNome: 'Ataque' },
        { nome: 'Ferida', rolagemNome: 'Dano' },
      ],
    };

    it('inicia no passo 0 e avança pro passo 1 após executar o primeiro', () => {
      const alvo = montar([combo]);
      alvo.componentInstance['iniciarExecucao'](0);
      expect(alvo.componentInstance['passoAtualIndice']()).toBe(0);

      alvo.componentInstance['executarPassoAtual']();
      expect(alvo.mostrar).toHaveBeenCalledOnce();
      expect(alvo.mostrar.mock.calls[0][0].rotulo).toBe('Golpe (Ataque)');
      expect(alvo.componentInstance['executandoIndice']()).toBe(0);
      expect(alvo.componentInstance['passoAtualIndice']()).toBe(1);
    });

    it('fecha o runner após executar o último passo', () => {
      const alvo = montar([combo]);
      alvo.componentInstance['iniciarExecucao'](0);
      alvo.componentInstance['executarPassoAtual'](); // passo 0
      alvo.componentInstance['executarPassoAtual'](); // passo 1 (último)

      expect(alvo.mostrar).toHaveBeenCalledTimes(2);
      expect(alvo.mostrar.mock.calls[1][0].rotulo).toBe('Ferida (Dano)');
      expect(alvo.componentInstance['executandoIndice']()).toBeNull();
    });

    it('passo com referência quebrada (preset renomeado/apagado) não trava — só avança', () => {
      const comboQuebrado: FichaComboDto = {
        nome: 'Combo quebrado',
        passos: [{ nome: 'Fantasma', rolagemNome: 'Preset Inexistente' }],
      };
      const alvo = montar([comboQuebrado]);
      alvo.componentInstance['iniciarExecucao'](0);
      expect(alvo.componentInstance['passoAtualNaoEncontrado']()).toBe(true);

      alvo.componentInstance['executarPassoAtual']();
      expect(alvo.mostrar).not.toHaveBeenCalled();
      expect(alvo.componentInstance['executandoIndice']()).toBeNull();
    });

    it('mostra "preset não encontrado" na UI pro passo com referência quebrada', () => {
      const comboQuebrado: FichaComboDto = {
        nome: 'Combo quebrado',
        passos: [{ nome: 'Fantasma', rolagemNome: 'Preset Inexistente' }],
      };
      const alvo = montar([comboQuebrado]);
      alvo.componentInstance['iniciarExecucao'](0);
      alvo.fixture.detectChanges();
      expect(alvo.raiz.textContent).toContain('preset não encontrado');
    });

    it('remover o combo em execução fecha o runner', () => {
      const alvo = montar([combo]);
      alvo.componentInstance['iniciarExecucao'](0);
      alvo.componentInstance['removerPedido'](0);
      alvo.componentInstance['confirmarRemocao'](0);
      expect(alvo.componentInstance['executandoIndice']()).toBeNull();
    });
  });

  it('quando não editável, não mostra "+ Novo combo" nem lápis/remover, mas "Executar" continua disponível', () => {
    const combo: FichaComboDto = { nome: 'Combo', passos: [{ nome: 'A', rolagemNome: 'Ataque' }] };
    const { raiz } = montar([combo], false);
    expect(raiz.querySelector('.ficha-combos__novo')).toBeNull();
    expect(raiz.querySelector('.ficha-combos__mini-btn')).toBeNull();
    const executar = Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Executar');
    expect(executar).not.toBeUndefined();
  });
});
