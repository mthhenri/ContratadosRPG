import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { HabilidadeCategoriaEnum, RolagemModoEnum, RolagemPresetTipoEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagens } from './ficha-rolagens.component';

/**
 * Prova o editor da aba Rolagens (m3-15; Rolagem v2 em m3-22): adicionar/editar/remover presets
 * (Teste/Soma, encadeados, com habilidades) e **rolar cada passo** — reusando `shared/regras/rolagem`
 * (`resolverPreset`/`rolarPasso`; nenhuma regra de dados no componente). Controlado: cada mutação emite
 * a lista inteira por `rolagensMudou`; o resultado do roll vai para a bandeja global (`mostrar`), e a
 * energia das habilidades vinculadas sai por `energiaGasta` ao rolar o passo primário.
 */
describe('FichaRolagens', () => {
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

  function montar(
    rolagens: readonly FichaRolagemDto[],
    opcoes: {
      editavel?: boolean;
      proficiencia?: number | null;
      habilidades?: readonly FichaHabilidadeDto[];
    } = {},
  ) {
    TestBed.configureTestingModule({ imports: [FichaRolagens] });
    const fixture = TestBed.createComponent(FichaRolagens);
    fixture.componentRef.setInput('rolagens', rolagens);
    fixture.componentRef.setInput('atributos', atributos);
    fixture.componentRef.setInput('editavel', opcoes.editavel ?? true);
    if (opcoes.proficiencia !== undefined) {
      fixture.componentRef.setInput('proficiencia', opcoes.proficiencia);
    }
    if (opcoes.habilidades) {
      fixture.componentRef.setInput('habilidadesDisponiveis', opcoes.habilidades);
    }
    const emitidos: (readonly FichaRolagemDto[])[] = [];
    fixture.componentInstance.rolagensMudou.subscribe((lista) => emitidos.push(lista));
    const energias: number[] = [];
    fixture.componentInstance.energiaGasta.subscribe((valor) => energias.push(valor));
    fixture.detectChanges();
    const bandeja = TestBed.inject(BandejaDadosService);
    const mostrar = vi.spyOn(bandeja, 'mostrar').mockImplementation(() => undefined);
    return { fixture, componentInstance: fixture.componentInstance, emitidos, energias, mostrar };
  }

  it('adiciona um preset simples (nome + fórmula) e emite a lista enxuta (modo SOMA omitido)', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].patchValue({ nome: '  Ataque  ', formula: '  1d20 + LUT  ' });
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([{ nome: 'Ataque', formula: '1d20 + LUT' }]);
  });

  it('grava o modo Teste no preset', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].patchValue({ nome: 'Percepção', formula: 'sentidos' });
    alvo.componentInstance['form'].controls.modo.setValue(RolagemModoEnum.TESTE);
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([{ nome: 'Percepção', formula: 'sentidos', modo: RolagemModoEnum.TESTE }]);
  });

  it('edita um preset existente substituindo-o na lista', () => {
    const alvo = montar([{ nome: 'A', formula: '1d20' }]);
    alvo.componentInstance['editar'](0);
    alvo.componentInstance['form'].patchValue({ nome: 'A+', formula: '1d20+FOR', descricao: 'nota' });
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([{ nome: 'A+', formula: '1d20+FOR', descricao: 'nota' }]);
  });

  it('remove um preset', () => {
    const alvo = montar([
      { nome: 'A', formula: '1d20' },
      { nome: 'B', formula: '1d6' },
    ]);
    alvo.componentInstance['confirmarRemocao'](0);
    expect(alvo.emitidos[0]).toEqual([{ nome: 'B', formula: '1d6' }]);
  });

  it('adiciona um passo seguinte e grava o preset como ENCADEADO', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].patchValue({ nome: 'Espada', formula: 'luta' });
    alvo.componentInstance['form'].controls.modo.setValue(RolagemModoEnum.TESTE);
    alvo.componentInstance['adicionarPasso']();
    alvo.componentInstance['seguintes'].at(0).patchValue({ nome: 'Dano', formula: '2d6 + FOR' });
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([
      {
        nome: 'Espada',
        formula: 'luta',
        modo: RolagemModoEnum.TESTE,
        tipo: RolagemPresetTipoEnum.ENCADEADO,
        seguintes: [{ nome: 'Dano', formula: '2d6 + FOR' }],
      },
    ]);
  });

  it('rola um passo e o joga na bandeja com total dentro da faixa', () => {
    const alvo = montar([{ nome: 'Ataque', formula: '1d20+LUT+2' }]);
    const vm = alvo.componentInstance['presets']()[0];
    alvo.componentInstance['rolarPassoDoPreset'](vm, 0);
    expect(alvo.mostrar).toHaveBeenCalledOnce();
    // 1d20 (1..20) + LUT (3) + 2 → total em [6, 25].
    const arg = alvo.mostrar.mock.calls[0][0];
    expect(arg.resultado.total).toBeGreaterThanOrEqual(6);
    expect(arg.resultado.total).toBeLessThanOrEqual(25);
  });

  it('debita a energia das habilidades vinculadas ao rolar o passo primário', () => {
    const forcaBruta: FichaHabilidadeDto = {
      nome: 'Força Bruta',
      categoria: HabilidadeCategoriaEnum.GERAL,
      custoEnergia: 2,
      descricao: '',
    };
    const alvo = montar([{ nome: 'Pancada', formula: '2d6', habilidades: ['Força Bruta'] }], {
      habilidades: [forcaBruta],
    });
    const vm = alvo.componentInstance['presets']()[0];
    expect(vm.plano.habilidadesVinculadas).toEqual(['Força Bruta']);
    alvo.componentInstance['rolarPassoDoPreset'](vm, 0);
    expect(alvo.energias).toEqual([2]);
    expect(alvo.mostrar).toHaveBeenCalledOnce();
  });

  it('marca fórmula inválida no passo e não rola (nada vai para a bandeja)', () => {
    const alvo = montar([{ nome: 'Ruim', formula: 'abc' }]);
    const vm = alvo.componentInstance['presets']()[0];
    expect(vm.plano.passos[0].interpretacao.valida).toBe(false);
    alvo.componentInstance['rolarPassoDoPreset'](vm, 0);
    expect(alvo.mostrar).not.toHaveBeenCalled();
  });
});
