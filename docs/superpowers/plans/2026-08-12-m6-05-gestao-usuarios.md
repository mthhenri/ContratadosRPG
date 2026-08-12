# M6-05 — Gestão de usuários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tela administrativa completa de usuários em `/admin/usuarios`, acessível pela topbar apenas para administradores.

**Architecture:** O `adminGuard` e o layout consomem o tipo persistido pelo `SessaoService`. Um `UsuarioAdminService` isolado transporta os DTOs do shared, enquanto a página standalone mantém filtros, paginação e o único editor inline aberto em Signals e usa Reactive Forms para todas as mutações.

**Tech Stack:** Angular 21 standalone, Signals, Reactive Forms, PrimeNG 21, Vitest, SCSS/BEM e DTOs de `@contratados-rpg/shared`.

## Global Constraints

- Implementar exatamente `docs/specs/backlog/m6-05-frontend-gestao-usuarios.spec.md` e o design aprovado em `docs/superpowers/specs/2026-08-12-m6-05-gestao-usuarios-design.md`.
- Preservar `docs/context/IDEAS.md`, que contém alteração preexistente fora do escopo.
- Aplicar TDD: observar cada teste novo falhar pela ausência do comportamento antes de escrever produção.
- Usar somente DTOs/enums do shared; não redefinir contratos no frontend.
- Usar standalone components, Signals, Reactive Forms e SCSS/BEM com tokens do tema.
- Exibir rótulos `Normal`, `Administrador` e `Testador`, nunca códigos crus.
- Erros HTTP permanecem no `error-handler.interceptor`; a página não captura nem traduz erros de negócio.
- A busca única consulta nome OU login após debounce de 300 ms; tipo e situação consultam imediatamente.
- A situação aceita `ATIVOS`, `EXCLUIDOS` e `TODOS`, com `ATIVOS` como padrão.
- Verificar a aplicação real em `1920×1080` e `360×800` com a skill `verify`.

---

### Task 1: Tipo da sessão e guard administrativo

**Files:**
- Modify: `shared/src/dtos/usuario/usuario.dtos.ts`
- Create: `frontend/src/app/core/guards/admin.guard.ts`
- Create: `frontend/src/app/core/guards/admin.guard.spec.ts`
- Modify: `frontend/src/app/core/services/sessao.service.spec.ts`

**Interfaces:**
- Consumes: `TipoUsuarioEnum` e `SessaoService.usuario(): UsuarioAutenticadoDto | null`.
- Produces: `UsuarioAutenticadoDto.tipo: TipoUsuarioEnum` e `adminGuard: CanActivateFn`.

- [ ] **Step 1: Escrever testes que exigem o tipo persistido e o guard**

```ts
it('libera um administrador', () => {
  abrirSessao({ token: 'jwt', id: 1, login: 'admin', nome: 'Admin', tipo: TipoUsuarioEnum.ADMIN });
  expect(TestBed.runInInjectionContext(() => adminGuard(rota, estado))).toBe(true);
});

it('redireciona usuário não administrador ao painel', () => {
  abrirSessao({ token: 'jwt', id: 2, login: 'agente', nome: 'Agente', tipo: TipoUsuarioEnum.NORMAL });
  expect(router.serializeUrl(TestBed.runInInjectionContext(() => adminGuard(rota, estado)) as UrlTree))
    .toBe('/painel');
});
```

- [ ] **Step 2: Rodar o RED focado**

Run: `npm.cmd test --workspace=frontend -- --run admin.guard.spec.ts sessao.service.spec.ts`
Expected: FAIL porque `UsuarioAutenticadoDto.tipo` e `adminGuard` ainda não existem.

- [ ] **Step 3: Implementar o campo e o guard mínimo**

```ts
export interface UsuarioAutenticadoDto {
  readonly token: string;
  readonly id: number;
  readonly login: string;
  readonly nome: string;
  readonly tipo: TipoUsuarioEnum;
}

export const adminGuard: CanActivateFn = () => {
  const sessaoService = inject(SessaoService);
  const router = inject(Router);
  return sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN
    ? true
    : router.createUrlTree(['/painel']);
};
```

- [ ] **Step 4: Rodar o GREEN focado**

Run: `npm.cmd test --workspace=frontend -- --run admin.guard.spec.ts sessao.service.spec.ts`
Expected: PASS.

### Task 2: Cliente HTTP administrativo

**Files:**
- Create: `frontend/src/app/modules/usuario/usuario-admin.service.ts`
- Create: `frontend/src/app/modules/usuario/usuario-admin.service.spec.ts`

**Interfaces:**
- Consumes: DTOs `UsuarioListarDto`, `UsuarioListadosDto`, `UsuarioCriarDto`, `UsuarioCriadoDto`, `UsuarioPerfilAlterarDto`, `UsuarioPerfilAlteradoDto`, `UsuarioSenhaResetarDto`, `UsuarioSenhaResetadaDto`, `UsuarioTipoAlterarDto`, `UsuarioTipoAlteradoDto`, `UsuarioReativadoDto`.
- Produces: métodos `listarUsuarios`, `criarUsuario`, `alterarUsuario`, `resetarSenha`, `alterarTipo`, `excluirUsuario` e `reativarUsuario`.

Antes do cliente, estender `UsuarioListarDto` com `busca?: string` e
`situacao?: UsuarioSituacaoEnum`, ajustar controller/repository para `nome OR login` e para omitir
o filtro de `is_deleted` quando a situação for `TODOS`, com testes RED→GREEN no backend.

- [ ] **Step 1: Escrever testes de verbo, URL, query, corpo e envelope**

```ts
servico.listarUsuarios({ pagina: 2, itensPorPagina: 10, ordenarPor: 'nome', direcao: 'ASC', nome: 'Ana' })
  .subscribe((dados) => recebido = dados);
const requisicao = http.expectOne((req) => req.url.endsWith('/usuario/admin'));
expect(requisicao.request.method).toBe('GET');
expect(requisicao.request.params.get('pagina')).toBe('2');
expect(requisicao.request.params.get('nome')).toBe('Ana');

servico.resetarSenha({ id: 7, novaSenha: 'novaSenha123' }).subscribe();
expect(http.expectOne((req) => req.url.endsWith('/usuario/admin/7/senha')).request.method).toBe('PATCH');
```

Cobrir também `POST /usuario/admin`, `PATCH /usuario/admin/:id`, `PATCH /tipo`,
`DELETE /usuario/admin/:id` e `PATCH /reativar`.

- [ ] **Step 2: Rodar o RED focado**

Run: `npm.cmd test --workspace=frontend -- --run usuario-admin.service.spec.ts`
Expected: FAIL porque o serviço ainda não existe.

- [ ] **Step 3: Implementar o transporte mínimo**

```ts
@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly httpClient = inject(HttpClient);
  private readonly base = `${environment.apiBase}/usuario/admin`;

  listarUsuarios(dto: UsuarioListarDto): Observable<UsuarioListadosDto> {
    return this.httpClient.get<StandardResponse<UsuarioListadosDto>>(this.base, {
      params: criarParametros(dto),
    }).pipe(map((resposta) => resposta.dados as UsuarioListadosDto));
  }

  resetarSenha(dto: UsuarioSenhaResetarDto): Observable<UsuarioSenhaResetadaDto> {
    return this.httpClient.patch<StandardResponse<UsuarioSenhaResetadaDto>>(
      `${this.base}/${dto.id}/senha`, { novaSenha: dto.novaSenha },
    ).pipe(map((resposta) => resposta.dados as UsuarioSenhaResetadaDto));
  }
}
```

Implementar os demais métodos com a mesma extração de `dados`, removendo `id` do corpo quando
ele já estiver na URL.

- [ ] **Step 4: Rodar o GREEN focado**

Run: `npm.cmd test --workspace=frontend -- --run usuario-admin.service.spec.ts`
Expected: PASS.

### Task 3: Rota lazy e item Admin na topbar

**Files:**
- Create: `frontend/src/app/modules/usuario/usuario-admin.routes.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/shared/layout/layout.component.html`
- Modify: `frontend/src/app/shared/layout/layout.component.ts`
- Modify: `frontend/src/app/shared/layout/layout.component.spec.ts`
- Modify: `frontend/src/app/shared/icone/icone.component.ts` somente se não houver ícone administrativo adequado.

**Interfaces:**
- Consumes: `adminGuard`, `TipoUsuarioEnum.ADMIN` e o futuro componente `UsuarioGestao`.
- Produces: rota `/admin/usuarios` e link `.topbar__item--admin` para administradores.

- [ ] **Step 1: Escrever testes de visibilidade e destino**

```ts
it('mostra Admin somente para sessão administrativa', () => {
  montarComSessao(TipoUsuarioEnum.ADMIN);
  const link = raiz.querySelector<HTMLAnchorElement>('.topbar__item--admin');
  expect(link?.textContent).toContain('Admin');
  expect(link?.getAttribute('href')).toBe('/admin/usuarios');
});

it.each([TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER])('oculta Admin para %s', (tipo) => {
  montarComSessao(tipo);
  expect(raiz.querySelector('.topbar__item--admin')).toBeNull();
});
```

- [ ] **Step 2: Rodar o RED focado**

Run: `npm.cmd test --workspace=frontend -- --run layout.component.spec.ts admin.guard.spec.ts`
Expected: FAIL porque o link e a rota ainda não existem.

- [ ] **Step 3: Implementar rota e navegação mínimas**

```ts
{
  path: 'admin',
  canActivate: [adminGuard],
  loadChildren: () => import('./modules/usuario/usuario-admin.routes')
    .then((modulo) => modulo.usuarioAdminRoutes),
}

export const usuarioAdminRoutes: Routes = [{
  path: 'usuarios',
  loadComponent: () => import('./paginas/gestao/gestao.page')
    .then((modulo) => modulo.UsuarioGestao),
}];
```

No layout, expor `TipoUsuarioEnum` ao template e renderizar o link entre Fichas e Calculadora
apenas para `usuarioAtual.tipo === TipoUsuarioEnum.ADMIN`.

- [ ] **Step 4: Rodar o GREEN focado**

Run: `npm.cmd test --workspace=frontend -- --run layout.component.spec.ts admin.guard.spec.ts`
Expected: PASS.

### Task 4: Página, filtros e paginação

**Files:**
- Create: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.ts`
- Create: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.html`
- Create: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.scss`
- Create: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.spec.ts`

**Interfaces:**
- Consumes: `UsuarioAdminService.listarUsuarios(dto)` e `TipoUsuarioEnum`.
- Produces: `UsuarioGestao`, Signals `usuarios`, `pagina`, `total`, `carregando`, `editorAberto` e forms de filtro/mutação.

- [ ] **Step 1: Escrever testes da consulta e dos estados visíveis**

```ts
it('carrega a primeira página e aplica login, nome, tipo e lixeira', () => {
  fixture.detectChanges();
  expect(servico.listarUsuarios).toHaveBeenCalledWith({
    pagina: 1, itensPorPagina: 10, ordenarPor: 'nome', direcao: 'ASC',
  });
  preencherFiltros({ login: 'ana', nome: 'martins', tipo: TipoUsuarioEnum.ADMIN, apenasExcluidos: true });
  expect(servico.listarUsuarios).toHaveBeenLastCalledWith(expect.objectContaining({
    pagina: 1, nome: 'martins', login: 'ana', tipo: TipoUsuarioEnum.ADMIN, apenasExcluidos: true,
  }));
});

it('mostra tipoDescricao e o vazio correspondente à lixeira', () => {
  responderLista({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 });
  expect(raiz.textContent).toContain('Nenhuma conta excluída');
});
```

- [ ] **Step 2: Rodar o RED focado**

Run: `npm.cmd test --workspace=frontend -- --run gestao.page.spec.ts`
Expected: FAIL porque a página ainda não existe.

- [ ] **Step 3: Implementar shell e estado mínimo**

```ts
type EditorUsuario = { readonly usuarioId: number; readonly modo: 'perfil' | 'senha' | 'tipo' } | null;

protected readonly usuarios = signal<UsuarioResumoDto[]>([]);
protected readonly pagina = signal(1);
protected readonly total = signal(0);
protected readonly editorAberto = signal<EditorUsuario>(null);
protected readonly filtroForm = this.formBuilder.nonNullable.group({
  login: [''], nome: [''], tipo: ['' as TipoUsuarioEnum | ''], apenasExcluidos: [false],
});

protected carregarUsuarios(): void {
  const { login, nome, tipo, apenasExcluidos } = this.filtroForm.getRawValue();
  this.usuarioAdminService.listarUsuarios({
    pagina: this.pagina(), itensPorPagina: 10, ordenarPor: 'nome', direcao: 'ASC',
    ...(login.trim() ? { login: login.trim() } : {}),
    ...(nome.trim() ? { nome: nome.trim() } : {}),
    ...(tipo ? { tipo } : {}), ...(apenasExcluidos ? { apenasExcluidos: true } : {}),
  }).subscribe((resultado) => {
    this.usuarios.set(resultado.itens);
    this.total.set(resultado.totalItens);
  });
}
```

Usar a estrutura visual da lista de campanhas, `tipoDescricao` no chip, controles com labels
acessíveis, paginação real e estados de esqueleto/vazio.

- [ ] **Step 4: Rodar o GREEN focado**

Run: `npm.cmd test --workspace=frontend -- --run gestao.page.spec.ts`
Expected: PASS para listagem, filtros e paginação.

### Task 5: Criação e editores inline

**Files:**
- Modify: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.ts`
- Modify: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.html`
- Modify: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.scss`
- Modify: `frontend/src/app/modules/usuario/paginas/gestao/gestao.page.spec.ts`

**Interfaces:**
- Consumes: todos os métodos de mutação do `UsuarioAdminService`.
- Produces: criação integrada, edição de perfil, senha e tipo inline, exclusão confirmada e reativação.

- [ ] **Step 1: Escrever testes das mutações observáveis**

```ts
it('mantém apenas um editor inline aberto e não revela senha anterior', () => {
  clicarAcao(7, 'Redefinir senha');
  expect(raiz.querySelector('input[type="password"]')).not.toBeNull();
  expect(raiz.textContent).not.toContain('senha atual');
  clicarAcao(8, 'Editar');
  expect(raiz.querySelector('[data-usuario-editor="7"]')).toBeNull();
  expect(raiz.querySelector('[data-usuario-editor="8"]')).not.toBeNull();
});

it('salva nova senha e recarrega a lista', () => {
  abrirSenha(7, 'novaSenha123');
  enviarEditor();
  expect(servico.resetarSenha).toHaveBeenCalledWith({ id: 7, novaSenha: 'novaSenha123' });
  expect(servico.listarUsuarios).toHaveBeenCalledTimes(2);
});

it('confirma exclusão e reativa uma conta da lixeira', () => {
  confirmarExclusao(7);
  expect(servico.excluirUsuario).toHaveBeenCalledWith({ id: 7 });
  ativarLixeira();
  clicarAcao(7, 'Reativar');
  expect(servico.reativarUsuario).toHaveBeenCalledWith({ id: 7 });
});
```

Cobrir também criação, edição de nome/login, troca de tipo, cancelamento, toggle do olhinho e
formulário inválido sem chamada HTTP.

- [ ] **Step 2: Rodar o RED focado**

Run: `npm.cmd test --workspace=frontend -- --run gestao.page.spec.ts`
Expected: FAIL porque as mutações ainda não existem.

- [ ] **Step 3: Implementar os formulários e recarga após sucesso**

```ts
protected abrirEditor(usuario: UsuarioResumoDto, modo: 'perfil' | 'senha' | 'tipo'): void {
  this.editorAberto.set({ usuarioId: usuario.id, modo });
  if (modo === 'perfil') this.perfilForm.reset({ nome: usuario.nome, login: usuario.login });
  if (modo === 'senha') this.senhaForm.reset({ novaSenha: '' });
  if (modo === 'tipo') this.tipoForm.reset({ tipo: usuario.tipo });
}

private concluirMutacao(observavel: Observable<unknown>): void {
  observavel.subscribe(() => {
    this.editorAberto.set(null);
    this.criacaoAberta.set(false);
    this.carregarUsuarios();
  });
}
```

Usar `window.confirm` com texto forte para exclusão, `aria-expanded` nos gatilhos, foco visível,
botões com mínimo de toque e `autocomplete="new-password"` no reset.

- [ ] **Step 4: Rodar o GREEN focado**

Run: `npm.cmd test --workspace=frontend -- --run gestao.page.spec.ts`
Expected: PASS para todos os fluxos administrativos.

### Task 6: Integração, documentação e verificação ao vivo

**Files:**
- Move: `docs/specs/backlog/m6-05-frontend-gestao-usuarios.spec.md` → `docs/specs/active/` no início da execução e → `docs/specs/done/` somente após os gates.
- Modify: `docs/context/CONTEXT.md`
- Modify: `docs/context/HISTORY.md`
- Preserve: `docs/context/IDEAS.md`

**Interfaces:**
- Consumes: todos os entregáveis anteriores.
- Produces: tarefa concluída, documentada e visualmente verificada.

- [ ] **Step 1: Rodar suítes, lint e builds completos**

```powershell
npm.cmd test --workspace=shared
npm.cmd test --workspace=frontend
npm.cmd run lint --workspace=shared
npm.cmd run lint --workspace=frontend
npm.cmd run build --workspace=shared
npm.cmd run build --workspace=frontend
git diff --check
```

Expected: todos os comandos com exit code 0 e nenhuma falha.

- [ ] **Step 2: Subir a aplicação real conforme a skill verify**

```powershell
npm.cmd run db:up
npm.cmd run db:migrate --workspace=backend
npm.cmd run backend:dev
npm.cmd run frontend:dev
```

Criar por REST um admin e contas NORMAL/TESTER, autenticar com sessão real e visitar
`http://localhost:4300/admin/usuarios`.

- [ ] **Step 3: Verificar todos os estados em `1920×1080` e `360×800`**

Confirmar pessoalmente: link Admin só para admin; guard de URL direta; listagem; busca por nome e
login; filtro de tipo; paginação; criação; edição de nome/login; reset de senha inline e olhinho;
troca de tipo; confirmação de exclusão; lixeira; reativação; toasts de erro; foco, contraste,
alvos de toque e ausência de overflow. Comparar densidade, hierarquia, chips, avatares e ações
com a tela de campanhas e corrigir qualquer divergência antes de prosseguir.

- [ ] **Step 4: Fechar spec e contexto**

Mover a spec para `done/`, acrescentar no topo de `HISTORY.md` a narrativa da implementação e
editar apenas as seções afetadas de `CONTEXT.md`, apontando M6-06 como próxima tarefa.

- [ ] **Step 5: Revisar o diff final**

Run: `git diff --stat; git diff --check; git status --short`
Expected: somente arquivos da M6-05 mais a alteração preexistente e não staged em `IDEAS.md`.
