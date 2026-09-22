import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RolagemVisibilidadeEnum, TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { SessaoService } from '../../core/services/sessao.service';
import { RolagemService } from '../../modules/ficha/rolagem.service';
import { ConfirmacaoService } from '../ui/confirmacao/confirmacao.service';
import { CartaoRolagem } from './cartao-rolagem.component';

const rolagem: RolagemResumoDto = {
  id: 9,
  fichaId: 10,
  encontroCombatenteId: null,
  campanhaId: 5,
  usuarioId: 7,
  nomeAutor: 'Agente',
  nomeFicha: 'Ficha',
  rotulo: 'Luta',
  formula: '2d6+3',
  visibilidade: RolagemVisibilidadeEnum.PUBLICA,
  resultado: { dados: [], atributos: [], constante: 0, total: 12 },
  createdDate: '2026-09-21T15:30:00',
  corFicha: '#d53030',
};

/** Prova o cartão único de rolagem: conteúdo, "privada", horário e a lixeira só para ADMIN (I-033). */
describe('CartaoRolagem', () => {
  const excluir = vi.fn(() => of({ id: 9, fichaId: 10, campanhaId: 5, visibilidade: rolagem.visibilidade }));

  function montar(
    tipo: TipoUsuarioEnum,
    dados: Partial<RolagemResumoDto> = {},
    tempo: string | null = null,
  ): ComponentFixture<CartaoRolagem> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CartaoRolagem],
      providers: [
        { provide: SessaoService, useValue: { usuario: signal({ tipo }) } },
        { provide: RolagemService, useValue: { excluir } },
      ],
    });
    const fixture = TestBed.createComponent(CartaoRolagem);
    fixture.componentRef.setInput('rolagem', { ...rolagem, ...dados });
    fixture.componentRef.setInput('autor', 'Agente · Ficha');
    fixture.componentRef.setInput('tempo', tempo);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra rótulo, autor, fórmula e o horário formatado', () => {
    const texto: string = montar(TipoUsuarioEnum.NORMAL).nativeElement.textContent;
    expect(texto).toContain('Luta');
    expect(texto).toContain('Agente · Ficha');
    expect(texto).toContain('2d6+3');
    expect(texto).toContain('21/09 15:30');
  });

  it('`tempo` sobrescreve o horário e "privada" aparece só na rolagem privada', () => {
    const publica = montar(TipoUsuarioEnum.NORMAL, {}, 'há 2 min');
    expect(publica.nativeElement.textContent).toContain('há 2 min');
    expect(publica.nativeElement.textContent).not.toContain('privada');

    const privada = montar(TipoUsuarioEnum.NORMAL, { visibilidade: RolagemVisibilidadeEnum.PRIVADA });
    expect(privada.nativeElement.textContent).toContain('privada');
  });

  it('não renderiza a lixeira para quem não é ADMIN', () => {
    expect(montar(TipoUsuarioEnum.NORMAL).nativeElement.querySelector('button')).toBeNull();
  });

  it('ADMIN vê a lixeira; clicar pede confirmação e confirmar exclui a rolagem', async () => {
    const fixture = montar(TipoUsuarioEnum.ADMIN);
    const confirmacao = TestBed.inject(ConfirmacaoService);
    fixture.nativeElement.querySelector('button').click();

    expect(confirmacao.pedido()?.titulo).toBe('Excluir rolagem');
    expect(excluir).not.toHaveBeenCalled();

    await confirmacao.responder(true);
    expect(excluir).toHaveBeenCalledWith(9);
  });
});
