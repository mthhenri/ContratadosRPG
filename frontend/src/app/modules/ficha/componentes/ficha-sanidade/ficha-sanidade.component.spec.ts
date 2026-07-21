import { TestBed } from '@angular/core/testing';
import { SeveridadeLesaoEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaLesaoDto,
  FichaSequelaDto,
  FichaTraumaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { EstadoSanidade, FichaSanidade } from './ficha-sanidade.component';

/**
 * Prova o editor no próprio lugar da aba Sanidade (m3-12): adicionar/editar/remover sequelas, traumas
 * e lesões, alternar "tratado" in loco, e o efeito derivado da lesão. Controlado — cada mutação emite
 * o **trio inteiro** por `sanidadeMudou`; sem trava de regra (liberdade total, m3-10).
 */
describe('FichaSanidade', () => {
  const sequelas: FichaSequelaDto[] = [{ nome: 'Insônia', descricao: '−1m' }];
  const traumas: FichaTraumaDto[] = [{ nome: 'Pânico', tratado: false }];
  const lesoes: FichaLesaoDto[] = [
    { atributo: 'vigor', pontos: 3, severidade: SeveridadeLesaoEnum.GRAVE, permanente: false },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [FichaSanidade] });
    const fixture = TestBed.createComponent(FichaSanidade);
    fixture.componentRef.setInput('sequelas', sequelas);
    fixture.componentRef.setInput('traumas', traumas);
    fixture.componentRef.setInput('lesoes', lesoes);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: EstadoSanidade[] = [];
    fixture.componentInstance.sanidadeMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('é só leitura quando não editável: lista os itens sem botões de ação', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.sanidade__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toContain('Insônia');
    expect(nomes).toContain('Pânico');
    expect(nomes).toContain('−3 Vigor'); // efeito derivado da lesão
    expect(raiz.querySelector('.sanidade__add')).toBeNull();
    expect(raiz.querySelector('.sanidade__acao')).toBeNull();
  });

  it('adiciona uma sequela e emite o trio com o novo item', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']('sequela');
    alvo.fixture.componentInstance['sequelaForm'].setValue({ nome: '  Vertigem  ', descricao: '' });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    // O mais recente entra no topo (Vertigem antes de Insônia).
    expect(alvo.emitidos[0].sequelas).toEqual([
      { nome: 'Vertigem' }, // aparado; sem descrição vazia
      { nome: 'Insônia', descricao: '−1m' },
    ]);
    // Os outros dois blocos seguem intactos.
    expect(alvo.emitidos[0].traumas).toBe(traumas);
    expect(alvo.emitidos[0].lesoes).toBe(lesoes);
  });

  it('não emite ao confirmar uma sequela sem nome (forma inválida)', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']('sequela');
    alvo.fixture.componentInstance['sequelaForm'].setValue({ nome: '', descricao: 'x' });
    alvo.fixture.componentInstance['confirmar']();
    expect(alvo.emitidos).toHaveLength(0);
  });

  it('edita um trauma existente e emite a substituição', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['editar']('trauma', 0);
    alvo.fixture.componentInstance['traumaForm'].patchValue({ nome: 'Pânico crônico', tratado: true });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0].traumas).toEqual([{ nome: 'Pânico crônico', tratado: true }]);
  });

  it('alterna "tratado" de um trauma no próprio lugar', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['alternarTratado'](0);
    expect(alvo.emitidos[0].traumas).toEqual([{ nome: 'Pânico', tratado: true }]);
  });

  it('remove uma lesão só após a confirmação inline', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    // Pedir a remoção abre a confirmação, mas ainda não emite nada.
    componente['pedirRemocao']('lesao', 0);
    expect(componente['removendo']('lesao', 0)).toBe(true);
    expect(alvo.emitidos).toHaveLength(0);
    // Confirmar remove, emite o trio sem a lesão e fecha a confirmação.
    componente['remover']('lesao', 0);
    expect(alvo.emitidos[0].lesoes).toEqual([]);
    expect(componente['removendo']('lesao', 0)).toBe(false);
  });

  it('cancelar a remoção fecha a confirmação sem emitir', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    componente['pedirRemocao']('trauma', 0);
    componente['cancelarRemocao']();
    expect(componente['removendo']('trauma', 0)).toBe(false);
    expect(alvo.emitidos).toHaveLength(0);
  });

  it('lesão: sugere pontos por severidade (documento) e ajusta com o stepper; efeito derivado', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    componente['adicionar']('lesao');
    // Troca para MORTAL → sugere 5 pontos.
    componente['lesaoForm'].controls.severidade.setValue(SeveridadeLesaoEnum.MORTAL);
    componente['sugerirPontos']();
    expect(componente['lesaoForm'].controls.pontos.value).toBe(5);
    // Stepper baixa até 0 e trava no piso.
    componente['ajustarPontos'](-5);
    componente['ajustarPontos'](-1);
    expect(componente['lesaoForm'].controls.pontos.value).toBe(0);
    // Efeito exibido.
    expect(
      componente['efeitoLesao']({
        atributo: 'forca',
        pontos: 2,
        severidade: SeveridadeLesaoEnum.GRAVE,
        permanente: true,
      }),
    ).toBe('−2 Força');
  });

  it('adiciona uma lesão preenchida e emite o trio com o novo item', () => {
    const alvo = montar(true);
    const componente = alvo.fixture.componentInstance;
    componente['adicionar']('lesao');
    componente['lesaoForm'].setValue({
      atributo: 'destreza',
      pontos: 1,
      severidade: SeveridadeLesaoEnum.LEVE,
      permanente: false,
      descricao: '  Corte profundo  ',
    });
    componente['confirmar']();

    // O mais recente entra no topo.
    expect(alvo.emitidos[0].lesoes).toEqual([
      {
        atributo: 'destreza',
        pontos: 1,
        severidade: SeveridadeLesaoEnum.LEVE,
        permanente: false,
        descricao: 'Corte profundo', // aparada; só incluída quando há texto
      },
      { atributo: 'vigor', pontos: 3, severidade: SeveridadeLesaoEnum.GRAVE, permanente: false },
    ]);
  });
});
