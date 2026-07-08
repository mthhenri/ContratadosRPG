import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  UsuarioPerfilAlteradoDto,
  UsuarioRecuperadoDto,
  UsuarioSenhaAlteradaDto,
} from '@contratados-rpg/shared/dtos/usuario';

import { Perfil } from './perfil.page';
import { UsuarioService } from '../../usuario.service';
import { SessaoService } from '../../../../core/services/sessao.service';

/**
 * Prova o comportamento de frontend da m2-14 na tela de perfil: carrega o perfil nos campos;
 * salvar o perfil chama `alterarPerfil` e reflete a nova identidade na sessão (topbar); trocar a
 * senha chama `alterarSenha` e limpa o formulário; excluir a conta exige confirmação, chama
 * `excluirConta`, encerra a sessão e navega ao `/login`. A autoridade é o backend (§14).
 */
describe('Perfil', () => {
  const perfilBase: UsuarioRecuperadoDto = { id: 7, login: 'agente.007', nome: 'Agente Sete' };

  function montar(opts?: { alterarPerfilRetorno?: Observable<UsuarioPerfilAlteradoDto> }) {
    const usuarioService = {
      recuperarPerfil: vi.fn(() => of({ ...perfilBase })),
      alterarPerfil: vi.fn(
        () =>
          opts?.alterarPerfilRetorno ??
          of({ id: 7, login: 'agente.007', nome: 'Agente Sete' } as UsuarioPerfilAlteradoDto),
      ),
      alterarSenha: vi.fn(() =>
        of({ id: 7, login: 'agente.007', nome: 'Agente Sete' } as UsuarioSenhaAlteradaDto),
      ),
      excluirConta: vi.fn(() => of(undefined)),
    };
    const sessaoService = { atualizarPerfil: vi.fn(), sair: vi.fn() };

    TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: UsuarioService, useValue: usuarioService },
        { provide: SessaoService, useValue: sessaoService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      usuarioService,
      sessaoService,
      navegar,
    };
  }

  function preencher(input: HTMLInputElement, valor: string): void {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('carrega o perfil nos campos de nome/login', () => {
    const { raiz } = montar();
    const nome = raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement;
    const login = raiz.querySelector('input[formControlName="login"]') as HTMLInputElement;
    expect(nome.value).toBe('Agente Sete');
    expect(login.value).toBe('agente.007');
  });

  it('salva o perfil e reflete a nova identidade na sessão', () => {
    const alterado: UsuarioPerfilAlteradoDto = { id: 7, login: 'novo.login', nome: 'Novo Nome' };
    const { fixture, raiz, usuarioService, sessaoService } = montar({
      alterarPerfilRetorno: of(alterado),
    });

    preencher(raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement, 'Novo Nome');
    preencher(raiz.querySelector('input[formControlName="login"]') as HTMLInputElement, 'novo.login');
    (raiz.querySelectorAll('.perfil__formulario')[0] as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(usuarioService.alterarPerfil).toHaveBeenCalledWith({
      nome: 'Novo Nome',
      login: 'novo.login',
    });
    expect(sessaoService.atualizarPerfil).toHaveBeenCalledWith({
      nome: 'Novo Nome',
      login: 'novo.login',
    });
  });

  it('troca a senha e limpa o formulário', () => {
    const { fixture, raiz, usuarioService } = montar();

    preencher(raiz.querySelector('input[formControlName="senhaAtual"]') as HTMLInputElement, 'antiga');
    const novaSenha = raiz.querySelector('input[formControlName="novaSenha"]') as HTMLInputElement;
    preencher(novaSenha, 'novasecreta');
    (raiz.querySelectorAll('.perfil__formulario')[1] as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(usuarioService.alterarSenha).toHaveBeenCalledWith({
      senhaAtual: 'antiga',
      novaSenha: 'novasecreta',
    });
    expect((raiz.querySelector('input[formControlName="novaSenha"]') as HTMLInputElement).value).toBe('');
  });

  it('não troca a senha com nova senha curta demais', () => {
    const { fixture, raiz, usuarioService } = montar();

    preencher(raiz.querySelector('input[formControlName="senhaAtual"]') as HTMLInputElement, 'antiga');
    preencher(raiz.querySelector('input[formControlName="novaSenha"]') as HTMLInputElement, '123');
    (raiz.querySelectorAll('.perfil__formulario')[1] as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(usuarioService.alterarSenha).not.toHaveBeenCalled();
  });

  it('exclui a conta após confirmação, encerra a sessão e navega ao login', () => {
    const { fixture, raiz, usuarioService, sessaoService, navegar } = montar();

    // "Excluir conta" abre a confirmação inline — sem excluir ainda.
    (raiz.querySelector('.perfil__acoes .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.perfil__exclusao')).not.toBeNull();
    expect(usuarioService.excluirConta).not.toHaveBeenCalled();

    (raiz.querySelector('.perfil__exclusao .botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(usuarioService.excluirConta).toHaveBeenCalled();
    expect(sessaoService.sair).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('cancela a exclusão sem chamar o backend', () => {
    const { fixture, raiz, usuarioService } = montar();

    (raiz.querySelector('.perfil__acoes .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.perfil__exclusao .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.perfil__exclusao')).toBeNull();
    expect(usuarioService.excluirConta).not.toHaveBeenCalled();
  });
});
