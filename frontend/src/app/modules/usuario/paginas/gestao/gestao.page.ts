import { Component, DestroyRef, HostListener, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Observable } from 'rxjs';
import { UsuarioResumoDto } from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum, UsuarioSituacaoEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { UsuarioAdminService } from '../../usuario-admin.service';

type ModoEditor = 'perfil' | 'senha' | 'tipo';
interface EditorUsuario { readonly usuarioId: number; readonly modo: ModoEditor }

@Pipe({ name: 'tipoRotulo', standalone: true })
export class TipoRotuloPipe implements PipeTransform {
  transform(tipos: readonly { codigo: TipoUsuarioEnum; rotulo: string }[], tipo: TipoUsuarioEnum): string {
    return tipos.find((opcao) => opcao.codigo === tipo)?.rotulo ?? tipo;
  }
}

@Component({
  selector: 'app-usuario-gestao',
  imports: [ReactiveFormsModule, Icone, TipoRotuloPipe, Tooltip],
  templateUrl: './gestao.page.html',
  styleUrl: './gestao.page.scss',
})
export class UsuarioGestao {
  private readonly usuarioAdminService = inject(UsuarioAdminService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly TipoUsuarioEnum = TipoUsuarioEnum;
  protected readonly UsuarioSituacaoEnum = UsuarioSituacaoEnum;
  protected readonly tipos = [
    { codigo: TipoUsuarioEnum.NORMAL, rotulo: 'Normal' },
    { codigo: TipoUsuarioEnum.ADMIN, rotulo: 'Administrador' },
    { codigo: TipoUsuarioEnum.TESTER, rotulo: 'Testador' },
  ];
  protected readonly usuarios = signal<UsuarioResumoDto[]>([]);
  protected readonly carregando = signal(true);
  protected readonly pagina = signal(1);
  protected readonly totalItens = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly editorAberto = signal<EditorUsuario | null>(null);
  protected readonly criacaoAberta = signal(false);
  protected readonly senhaVisivel = signal(false);
  protected readonly exclusaoPendenteId = signal<number | null>(null);
  protected readonly menuTipoUsuarioId = signal<number | null>(null);
  protected readonly tipoPendente = signal<{ usuarioId: number; tipo: TipoUsuarioEnum } | null>(null);

  protected readonly filtroForm = this.formBuilder.nonNullable.group({
    busca: [''], tipo: ['' as TipoUsuarioEnum | ''], situacao: [UsuarioSituacaoEnum.ATIVOS],
  });
  protected readonly criacaoForm = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required], login: ['', Validators.required],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    tipo: [TipoUsuarioEnum.NORMAL, Validators.required],
  });
  protected readonly perfilForm = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required], login: ['', Validators.required],
  });
  protected readonly senhaForm = this.formBuilder.nonNullable.group({
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
  });
  protected readonly tipoForm = this.formBuilder.nonNullable.group({
    tipo: [TipoUsuarioEnum.NORMAL, Validators.required],
  });

  constructor() {
    this.carregarUsuarios();
    this.filtroForm.controls.busca.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.aplicarFiltros());
    this.filtroForm.controls.tipo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());
    this.filtroForm.controls.situacao.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());
  }

  protected carregarUsuarios(): void {
    this.carregando.set(true);
    const filtro = this.filtroForm.getRawValue();
    this.usuarioAdminService.listarUsuarios({
      pagina: this.pagina(), itensPorPagina: 10, ordenarPor: 'nome', direcao: 'ASC',
      ...(filtro.busca.trim() ? { busca: filtro.busca.trim() } : {}),
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      situacao: filtro.situacao,
    }).pipe(finalize(() => this.carregando.set(false))).subscribe((resultado) => {
      this.usuarios.set(resultado.itens);
      this.totalItens.set(resultado.totalItens);
      this.totalPaginas.set(resultado.totalPaginas);
    });
  }

  protected aplicarFiltros(): void { this.pagina.set(1); this.fecharEdicao(); this.carregarUsuarios(); }
  protected limparFiltros(): void {
    this.filtroForm.reset(
      { busca: '', tipo: '', situacao: UsuarioSituacaoEnum.ATIVOS },
      { emitEvent: false },
    );
    this.aplicarFiltros();
  }
  protected mudarPagina(delta: number): void { this.pagina.update((valor) => valor + delta); this.carregarUsuarios(); }
  protected alternarCriacao(): void { this.criacaoAberta.update((aberta) => !aberta); this.fecharEdicao(); }
  protected abrirEditor(usuario: UsuarioResumoDto, modo: ModoEditor): void {
    this.editorAberto.set({ usuarioId: usuario.id, modo }); this.criacaoAberta.set(false);
    this.exclusaoPendenteId.set(null); this.senhaVisivel.set(false);
    if (modo === 'perfil') this.perfilForm.reset({ nome: usuario.nome, login: usuario.login });
    if (modo === 'senha') this.senhaForm.reset({ novaSenha: '' });
    if (modo === 'tipo') this.tipoForm.reset({ tipo: usuario.tipo });
  }
  protected fecharEdicao(): void { this.editorAberto.set(null); this.exclusaoPendenteId.set(null); }
  protected alternarSenha(): void { this.senhaVisivel.update((visivel) => !visivel); }
  protected iconeTipo(tipo: TipoUsuarioEnum): 'agente' | 'protecoes' | 'amplificador' {
    if (tipo === TipoUsuarioEnum.ADMIN) return 'protecoes';
    if (tipo === TipoUsuarioEnum.TESTER) return 'amplificador';
    return 'agente';
  }
  protected alternarMenuTipo(usuario: UsuarioResumoDto): void {
    this.menuTipoUsuarioId.update((id) => id === usuario.id ? null : usuario.id);
    this.tipoPendente.set(null);
  }
  protected selecionarTipo(usuario: UsuarioResumoDto, tipo: TipoUsuarioEnum): void {
    this.tipoPendente.set({ usuarioId: usuario.id, tipo });
    this.menuTipoUsuarioId.set(null);
  }
  protected cancelarTipo(): void {
    this.tipoPendente.set(null);
    this.menuTipoUsuarioId.set(null);
  }
  @HostListener('document:click', ['$event'])
  protected fecharMenuTipoAoClicarFora(evento: MouseEvent): void {
    if (!(evento.target as Element | null)?.closest('.gestao__tipo-container')) {
      this.menuTipoUsuarioId.set(null);
    }
  }
  protected confirmarTipo(usuario: UsuarioResumoDto): void {
    const pendente = this.tipoPendente();
    if (!pendente || pendente.usuarioId !== usuario.id) return;
    this.concluir(this.usuarioAdminService.alterarTipo({ id: usuario.id, tipo: pendente.tipo }));
    this.tipoPendente.set(null);
  }
  protected criar(): void {
    if (this.criacaoForm.invalid) { this.criacaoForm.markAllAsTouched(); return; }
    this.concluir(this.usuarioAdminService.criarUsuario(this.criacaoForm.getRawValue()), true);
  }
  protected salvarPerfil(usuario: UsuarioResumoDto): void {
    if (this.perfilForm.invalid) return;
    this.concluir(this.usuarioAdminService.alterarUsuario({ id: usuario.id, ...this.perfilForm.getRawValue() }));
  }
  protected salvarSenha(usuario: UsuarioResumoDto): void {
    if (this.senhaForm.invalid) return;
    this.concluir(this.usuarioAdminService.resetarSenha({ id: usuario.id, ...this.senhaForm.getRawValue() }));
  }
  protected salvarTipo(usuario: UsuarioResumoDto): void {
    this.concluir(this.usuarioAdminService.alterarTipo({ id: usuario.id, ...this.tipoForm.getRawValue() }));
  }
  protected pedirExclusao(usuario: UsuarioResumoDto): void { this.exclusaoPendenteId.set(usuario.id); this.editorAberto.set(null); }
  protected confirmarExclusao(usuario: UsuarioResumoDto): void { this.concluir(this.usuarioAdminService.excluirUsuario({ id: usuario.id })); }
  protected reativar(usuario: UsuarioResumoDto): void { this.concluir(this.usuarioAdminService.reativarUsuario({ id: usuario.id })); }
  private concluir(operacao: Observable<unknown>, criou = false): void {
    operacao.subscribe(() => { this.fecharEdicao(); this.criacaoAberta.set(false); if (criou) this.criacaoForm.reset({ nome: '', login: '', senha: '', tipo: TipoUsuarioEnum.NORMAL }); this.carregarUsuarios(); });
  }
}
