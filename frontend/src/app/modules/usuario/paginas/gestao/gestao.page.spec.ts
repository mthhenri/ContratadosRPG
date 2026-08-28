import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { UsuarioSituacaoEnum } from '@contratados-rpg/shared/enums';
import { UsuarioResumoDto } from '@contratados-rpg/shared/dtos/usuario';

import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioGestao } from './gestao.page';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { Router } from '@angular/router';

interface GestaoTestApi {
  filtroForm: {
    setValue(valor: { busca: string; tipo: TipoUsuarioEnum | ''; situacao: UsuarioSituacaoEnum }): void;
    getRawValue(): { busca: string; tipo: TipoUsuarioEnum | ''; situacao: UsuarioSituacaoEnum };
  };
  senhaForm: { setValue(valor: { novaSenha: string }): void };
  aplicarFiltros(): void;
  limparFiltros(): void;
  abrirEditor(usuario: UsuarioResumoDto, modo: 'perfil' | 'senha' | 'tipo'): void;
  salvarSenha(usuario: UsuarioResumoDto): void;
  pedirExclusao(usuario: UsuarioResumoDto): void;
  confirmarExclusao(usuario: UsuarioResumoDto): void;
  reativar(usuario: UsuarioResumoDto): void;
}

describe('UsuarioGestao', () => {
  let fixture: ComponentFixture<UsuarioGestao>;
  let raiz: HTMLElement;
  const lista = {
    itens: [
      { id: 7, login: 'ana', nome: 'Ana', tipo: TipoUsuarioEnum.ADMIN, tipoDescricao: 'Administrador', isDeleted: false },
      { id: 8, login: 'bia', nome: 'Bia', tipo: TipoUsuarioEnum.NORMAL, tipoDescricao: 'Normal', isDeleted: false },
    ],
    totalItens: 2, paginaAtual: 1, totalPaginas: 1,
  };
  const servico = {
    listarUsuarios: vi.fn(() => of(lista)), criarUsuario: vi.fn(() => of({})),
    alterarUsuario: vi.fn(() => of({})), resetarSenha: vi.fn(() => of({})),
    alterarTipo: vi.fn(() => of({})), excluirUsuario: vi.fn(() => of(undefined)),
    reativarUsuario: vi.fn(() => of({})),
    impersonarUsuario: vi.fn(() => of({
      token: 'token-bia', id: 8, login: 'bia', nome: 'Bia', tipo: TipoUsuarioEnum.NORMAL,
    })),
  };

  beforeEach(async () => {
    Object.values(servico).forEach((mock) => mock.mockClear());
    await TestBed.configureTestingModule({
      imports: [UsuarioGestao, ReactiveFormsModule],
      providers: [{ provide: UsuarioAdminService, useValue: servico }],
    }).compileComponents();
    fixture = TestBed.createComponent(UsuarioGestao);
    raiz = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('lista pelo rótulo e aplica filtros administrativos', () => {
    expect(raiz.textContent).toContain('Administrador');
    expect(raiz.textContent).not.toContain('ADMIN');
    const componente = fixture.componentInstance as unknown as GestaoTestApi;
    componente.filtroForm.setValue({ busca: 'ana', tipo: TipoUsuarioEnum.ADMIN, situacao: UsuarioSituacaoEnum.EXCLUIDOS });
    componente.aplicarFiltros();
    expect(servico.listarUsuarios).toHaveBeenLastCalledWith(expect.objectContaining({
      pagina: 1, busca: 'ana', tipo: TipoUsuarioEnum.ADMIN, situacao: UsuarioSituacaoEnum.EXCLUIDOS,
    }));
  });

  it('limpa os filtros e restaura o padrão em uma única consulta', () => {
    const componente = fixture.componentInstance as unknown as GestaoTestApi;
    componente.filtroForm.setValue({
      busca: 'ana',
      tipo: TipoUsuarioEnum.ADMIN,
      situacao: UsuarioSituacaoEnum.EXCLUIDOS,
    });
    servico.listarUsuarios.mockClear();

    raiz.querySelector<HTMLButtonElement>('[aria-label="Limpar filtros"]')!.click();

    expect(componente.filtroForm.getRawValue()).toEqual({
      busca: '',
      tipo: '',
      situacao: UsuarioSituacaoEnum.ATIVOS,
    });
    expect(servico.listarUsuarios).toHaveBeenCalledTimes(1);
    expect(servico.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({
      pagina: 1,
      situacao: UsuarioSituacaoEnum.ATIVOS,
    }));
  });

  it('fecha o menu de tipo fora dele e permite cancelar uma troca pendente', () => {
    const tipos = raiz.querySelectorAll<HTMLButtonElement>('.gestao__tipo');
    tipos[1].click();
    fixture.detectChanges();
    expect(raiz.querySelector('.gestao__tipo-menu')).not.toBeNull();
    expect(raiz.querySelector('.gestao__item--menu-aberto')).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.gestao__tipo-menu')).toBeNull();

    tipos[1].click();
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('.gestao__tipo-menu [data-tipo="TESTER"]')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('[aria-label="Confirmar tipo"]')).not.toBeNull();

    raiz.querySelector<HTMLButtonElement>('[aria-label="Cancelar troca de tipo"]')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('[aria-label="Confirmar tipo"]')).toBeNull();
    expect(servico.alterarTipo).not.toHaveBeenCalled();
  });

  it('mantém somente um editor inline e nunca pede senha atual', () => {
    const componente = fixture.componentInstance as unknown as GestaoTestApi;
    componente.abrirEditor(lista.itens[0], 'senha');
    fixture.detectChanges();
    expect(raiz.querySelector('input[autocomplete="new-password"]')).not.toBeNull();
    expect(raiz.textContent?.toLowerCase()).not.toContain('senha atual');
    componente.abrirEditor(lista.itens[1], 'perfil');
    fixture.detectChanges();
    expect(raiz.querySelector('[data-usuario-editor="7"]')).toBeNull();
    expect(raiz.querySelector('[data-usuario-editor="8"]')).not.toBeNull();
  });

  it('redefine senha e recarrega a lista', () => {
    const componente = fixture.componentInstance as unknown as GestaoTestApi;
    componente.abrirEditor(lista.itens[0], 'senha');
    componente.senhaForm.setValue({ novaSenha: 'novaSenha123' });
    componente.salvarSenha(lista.itens[0]);
    expect(servico.resetarSenha).toHaveBeenCalledWith({ id: 7, novaSenha: 'novaSenha123' });
    expect(servico.listarUsuarios).toHaveBeenCalledTimes(2);
  });

  it('confirma exclusão inline e reativa conta da lixeira', () => {
    const componente = fixture.componentInstance as unknown as GestaoTestApi;
    componente.pedirExclusao(lista.itens[0]);
    componente.confirmarExclusao(lista.itens[0]);
    expect(servico.excluirUsuario).toHaveBeenCalledWith({ id: 7 });
    componente.reativar(lista.itens[0]);
    expect(servico.reativarUsuario).toHaveBeenCalledWith({ id: 7 });
  });

  it('omite a própria conta e troca integralmente a sessão somente após confirmação', () => {
    const sessao = TestBed.inject(SessaoService);
    sessao.substituirSessao({
      token: 'token-admin', id: 7, login: 'ana', nome: 'Ana', tipo: TipoUsuarioEnum.ADMIN,
    });
    const conectar = vi.spyOn(TestBed.inject(TempoRealService), 'conectar').mockImplementation(() => undefined);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    const botoes = Array.from(raiz.querySelectorAll<HTMLButtonElement>('button'))
      .filter((botao) => botao.textContent?.includes('Logar como'));
    expect(botoes).toHaveLength(1);
    botoes[0].click();
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Logar como Bia (bia)?');
    expect(servico.impersonarUsuario).not.toHaveBeenCalled();

    raiz.querySelector<HTMLButtonElement>('.gestao__confirmacao--impersonacao .botao--primario')!.click();

    expect(servico.impersonarUsuario).toHaveBeenCalledWith({ id: 8 });
    expect(sessao.usuario()).toEqual(expect.objectContaining({ token: 'token-bia', id: 8 }));
    expect(conectar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith('/campanhas');
  });
});
