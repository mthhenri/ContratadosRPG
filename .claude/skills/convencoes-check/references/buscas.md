# Buscas mecânicas do `convencoes-check`

> Os comandos leem somente linhas adicionadas/modificadas no patch atual. `rg` retornar 1 significa
> resultado limpo, não erro. Para um commit, troque `git diff --unified=0 HEAD` por
> `git diff <commit>^ <commit> --unified=0`; para auditoria total, use os equivalentes indicados
> em cada seção. Todo acerto exige leitura do trecho e da hunk próxima.

## Nomes e contratos TypeScript

```powershell
git diff --unified=0 HEAD -- '*.ts' '*.tsx' | rg -n -i '^\+[^+].*\b(readonly|private|protected|public|const|let|var|function)\s+\w*(atualizar|atualizado)\w*'
```

Identificadores devem usar `alterar`/`alterado`; texto de UI, comentário e documentação não entram.
Em auditoria total, rode `rg -n -i '\b(atualizar|atualizado)[A-Za-z0-9_]*\b' shared backend frontend --glob '*.{ts,tsx}'`: ele deve reencontrar `campanha.dtos.ts:atualizadoEm` e `ficha-edicao-criatura.service.ts:atualizarDados`.

```powershell
git diff --unified=0 HEAD -- '*.ts' '*.tsx' | rg -n '^\+[^+].*export (interface|class|type) \w+Dto\b'
git diff --unified=0 HEAD -- '*.ts' '*.tsx' | rg -n '^\+[^+].*(export )?enum\s+\w+'
```

Todo DTO declarado deve estar em `shared/src/dtos/`. Todo enum de domínio deve ficar em `shared/src/enums/`; leia os membros: string enum, valores iguais ao nome em `SCREAMING_SNAKE_CASE`. `Dto` citado/importado e enum local técnico são falsos positivos possíveis, mas exigem classificação.

```powershell
git diff --unified=0 HEAD -- '*.ts' '*.html' | rg -n '^\+[^+].*\b(NgModule|ngModel|ngForm)\b'
```

Feature nova é standalone e formulário é reativo. Imports/testes legados podem ser falso positivo; confirme se o achado entra no caminho de produção.

## SQL de runtime

```powershell
git diff --unified=0 HEAD -- 'backend/src/**/*.ts' 'backend/src/**/*.sql' | rg -n '^\+[^+].*(\?|\$\{[^}]+\})'
git diff --unified=0 HEAD -- 'backend/src/**/*.ts' 'backend/src/**/*.sql' | rg -n -i '^\+[^+].*(\binsert\s+into\b.*\bvalues\b|\bdefault\b)'
```

Em query de runtime, `?` posicional e interpolação são proibidos: use `:nomeParametro`. Fora de `migrations/`, INSERT deve ser `INSERT ... SELECT ... RETURNING` e coluna não recebe `DEFAULT`. `?` de TypeScript, template string que não é SQL, palavra `default` fora de SQL e migration com constante literal são falsos positivos.

```powershell
git diff --unified=0 HEAD -- 'backend/src/modules/**/*.repository.ts' | rg -n -i '^\+[^+].*\bselect\b'
git diff --unified=0 HEAD -- 'backend/src/**/*.ts' 'backend/src/**/*.sql' | rg -n -i '^\+[^+].*\bdelete(\s+from)?\b'
git diff --unified=0 HEAD -- 'backend/src/**/*.ts' | rg -n '^\+[^+].*\bprocess\.env\b'
```

Leia cada `SELECT` e confirme `is_deleted = false` para cada tabela lida; a busca não tenta interpretar SQL multilinha/CTE, portanto é candidata de revisão, não violação automática. Subquery que só lê `tipo_*` também precisa do filtro. DELETE físico é proibido; `executarSoftDelete` e comentários são falsos positivos. Fora de `backend/src/config/`, use `ConfigService`; hoje os acertos conhecidos em `process.env` são comentários citando a regra, então confirme que não é acesso executável.

## Frontend e estilo

```powershell
git diff --unified=0 HEAD -- 'frontend/src/**/*.html' | rg -n '^\+[^+].*\btitle\s*='
git diff --unified=0 HEAD -- 'frontend/src/**/*.scss' | rg -n '^\+[^+].*(#[A-Fa-f0-9]{3,8}\b|\b(rgb|hsl)a?\(|font-family\s*:|border-radius\s*:)' 
git diff --unified=0 HEAD -- 'frontend/src/**/*.html' | rg -n '^\+[^+].*\bstyle\s*='
git diff --unified=0 HEAD -- 'frontend/src/**/*.scss' | rg -n '^\+[^+]\s*#[-_A-Za-z0-9]+'
git diff --name-only HEAD | rg '\.css$'
```

Tooltip usa `[appTooltip]`; atributo `title` HTML nativo é violação. Estilo usa tokens, sem cor, fonte ou raio hardcoded. Permissões conhecidas: `#000` dentro de máscara/gradiente de fade em `acervo.page.scss` e `ficha-inventario.component.scss`; tokens globais são a fonte de verdade. `border-radius: 0` e `font-family: inherit` exigem leitura. `[style.--cor-ficha]` é a exceção canônica de instância por personagem; IDs em URL, cor em comentário e CSS de dependência não são seletor/arquivo de componente.

```powershell
git diff --unified=0 HEAD -- 'frontend/src/**/*.html' 'frontend/src/**/*.scss' | rg -n '^\+[^+].{101,}'
```

Linha longa é achado de legibilidade (`P-020`), não formate TypeScript em massa. A correção prevista é `npm run format:html-scss -w frontend`; confira o `package.json` antes de sugeri-la, porque até a spec de formatação fechar ela pode estar somente planejada.

## Auditoria total explícita

Sem expansão de lista de arquivos (que excede o limite de argumentos do Windows), substitua o prefixo `git diff ... |` pelo diretório adequado, por exemplo:

```powershell
rg -n -i '\b(atualizar|atualizado)[A-Za-z0-9_]*\b' shared backend frontend --glob '*.{ts,tsx}'
rg -n '\bprocess\.env\b' backend/src --glob '*.ts'
```

Não corrija nessa passada o que não pertence à task. Cada violação real encontrada é registrada em `docs/context/PROBLEMS.md` e recebe spec própria quando for priorizada.
