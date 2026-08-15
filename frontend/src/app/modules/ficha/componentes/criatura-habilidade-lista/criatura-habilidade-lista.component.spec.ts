import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaHabilidadeLista } from './criatura-habilidade-lista.component';

describe('CriaturaHabilidadeLista', () => {
  const itens: FichaCriaturaHabilidadeDto[] = [
    { nome: 'Pele de Pedra', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Reduz dano físico.' },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaHabilidadeLista] });
    const fixture = TestBed.createComponent(CriaturaHabilidadeLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaHabilidadeDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista as habilidades com nome e descrição', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.habilidade-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Pele de Pedra']);
  });

  it('só mostra editar/remover por item depois de ativar o modo de edição', () => {
    const { fixture, raiz } = montar(true);
    expect(raiz.querySelector('.habilidade-lista__acoes')).toBeNull();

    fixture.componentInstance['alternarModoEdicao']();
    fixture.detectChanges();
    expect(raiz.querySelector('.habilidade-lista__acoes')).not.toBeNull();

    fixture.componentInstance['alternarModoEdicao']();
    fixture.detectChanges();
    expect(raiz.querySelector('.habilidade-lista__acoes')).toBeNull();
  });

  it('adiciona uma habilidade e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena' },
    ]);
  });
});
