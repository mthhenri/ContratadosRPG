# RV-01 — execução e verificação

Spec dona: [pares de tabelas](../regras-visual-01-pares-tabelas.spec.md).

## Referência antes de editar

Análogo aprovado: `RegrasTabela`, nas tabelas de duas colunas de chave/valor;
Amplificadores confirma a associação contínua de nome e efeito no mobile.
Shell com borda `--border`, raio `--radius-control`, superfície `--surface`;
cabeçalho mono, corpo de 13px/1,55, padding `--space-8`/`--space-12` e margem
`--space-16`. Sem controles/ícones novos; região focável com contorno canônico,
rolagem própria e fade. No mobile, chave fixa de 120px e valor correspondente.
O shell, a busca, o sumário, os estados e as ações do leitor/painel são preservados.

Causa: a primeira coluna fixa identifica apenas a metade esquerda, mas sobrepõe
a chave da metade direita quando a tabela de quatro colunas é rolada.
Solução: classificar somente as quatro assinaturas conhecidas no normalizador;
projetar cada metade em sequência (esquerda, depois direita), numa tabela de duas
colunas. Fonte original intacta para auditoria; pares inteiramente vazios não
geram registros, células parcialmente vazias continuam vazias. Renderer apenas
consome a projeção explícita, sem reconhecer conceitos do jogo.

## Escopo e fidelidade

Somente quatro assinaturas exatas, restritas ao Sistema. A projeção reutiliza os
trechos inline da fonte, inclusive formatação e links; não acrescenta efeitos,
valores nem regras de jogo. Modelo de leitura e normalizador são do frontend.
Componente recebe a projeção pronta e mantém o fallback das tabelas comuns.
Não houve mudança em CSS, tokens, controles ou biblioteca de componentes.
A responsabilidade acrescentada ao componente é apenas escolher a fonte de
apresentação; não exige extração de um componente novo.

| Tabela | Registros | Conferência explícita |
|---|---|---|
| Grupo/Bônus | 21 | Combate (5), Movimento (2), Perícia (4), Equipamento (7), Logística (3); último Perícia preservado |
| Nível/Bônus | 21 | 00 → INICIAL; 11 → +1 Atributo; sequência 00–20, incluindo 10 sem par direito na fonte |
| Pontuação/Dano | 9 | Inferior à 0 → 0 de Dano [Físico]; 8 e 9 → 2D6; último par esquerdo 6 e 7 preservado |
| Treinamento/Bônus | 6 | Nenhum → INICIAL; Profissional → +1 Habilidade Civil e +1 Atributo; até Elite |

O teste do Markdown vigente compara **todos os 57 pares**, célula por célula,
contra as duas metades originais. Testes sintéticos cobrem vazios parciais, pares
inteiramente vazios, negrito, link interno real, assinatura desconhecida e Guia.
Prestígio/Patentes não recebem projeção; permanecem relacionais. A fonte de quatro
colunas continua no JSON para auditoria, mas não é renderizada em duplicidade.

## Verificação pessoal na aplicação real

Aplicação Angular disponível em `http://localhost:4300/regras/sistema`, observada
com a skill `verify` e o navegador do Codex. Conteúdo público; este recorte não
exige login, dados de campanha ou banco. Nenhuma captura de subagente utilizada.

| Viewport | Página | Painel normal | Painel maximizado |
|---|---|---|---|
| 1920×1080 | quatro tabelas, todas as linhas | quatro tabelas | quatro tabelas |
| 1366×768 | quatro tabelas, todas as linhas | quatro tabelas | quatro tabelas |
| 960×1080 | quatro tabelas, todas as linhas | quatro tabelas | quatro tabelas |
| 360×800 | quatro tabelas, todas as linhas | quatro tabelas, área disponível | não existe estado separado |

Página: capturas distribuídas entre início/meio/fim das tabelas longas e todos
os registros das curtas. Painéis: comparação dos 57 pares completos no DOM em
cada configuração, com inspeção pessoal dos quatro recortes renderizados.
No mobile, as regiões medem 280px (Formação) ou aproximadamente 298px (demais),
com `scrollWidth === clientWidth`. Tentativas de navegação horizontal à direita,
fim e esquerda mantêm `scrollLeft = 0`: agora os dois campos cabem juntos,
sem posições horizontais distintas que possam trocar a associação. Foco por
teclado confirmado nas quatro regiões; contorno e alvos do leitor preservados.

Comparação com o análogo: mesmo shell, densidade, hierarquia, bordas, tipografia,
padding e chave fixa; parece parte do produto e não formulário genérico. Texto
longo quebra dentro do valor, sem overflow. Contraste, ícones e estados seguem
os componentes existentes; nenhuma divergência deste recorte exigiu CSS novo.

Busca na página: `categoria de arma` / `itens medicinais`, `00` / `11`,
`Inferior à 0` / `8 e 9`, `Nenhum` / `Profissional`, cobrindo uma célula de cada
metade das quatro tabelas. Destaques conferidos após o debounce. Resultado de
Treinamentos navega à âncora `#treinamentos`; sumário mantém o mesmo destino.
No painel maximizado, resultado `Profissional` seleciona 4 de 4 e destaca a
chave correta ao lado de seu bônus. Escape limpa a busca.

Evidências brutas em `.artifacts/regras-visual-01-pares-tabelas/` (ignoradas):
`pagina-<largura>-t<índice>-r<linha>.png`, `painel-<largura>-<estado>-t<índice>.png`,
`painel-360-t<índice>.png`, `resultado-mobile.png`, `busca-painel-profissional.png`,
`matriz-painel.json` e `busca.json`. Índices DOM: 1 Formação, 2 Níveis,
5 Pontuação Corporal, 7 Treinamentos. Captura é evidência visual do recorte,
nunca substituto da comparação integral de células.

## Gates automatizados e revisão

- `npm run test --workspace=frontend -- --watch=false`: 86 testes dos scripts
  e 3214 testes Angular aprovados (242 arquivos), incluindo o teste do renderer.
- `npm run test --workspace=shared`: 1157 aprovados (69 arquivos).
- `npm run test --workspace=backend`: 995 aprovados, 1 ignorado (53 arquivos).
- `npm run build --workspace=frontend`: aprovado; publicação dos dois JSONs
  conferida contra Markdown. Aviso de orçamento inicial: 593,54kB para 450kB.
- `npm run lint`: aprovado sem erros; frontend com 27351 avisos do repositório.
- `node --test --test-name-pattern='RV-01' frontend/scripts/normalizar-regras.test.mjs`:
  3 aprovados novamente após reforçar a asserção de link interno.
- Revisão do diff do recorte: quatro assinaturas explícitas, fonte preservada,
  nenhum hardcode visual ou regra de domínio no renderer; template usa o mesmo
  `RegrasInline` e região canônica da tabela. Sem controles novos a conferir.
- `node --test frontend/scripts/normalizar-regras.test.mjs`: 25/25 aprovados no
  estado final, incluindo cobertura integral dos livros e contrato TypeScript.
- Prettier do template e ESLint do componente/teste: aprovados sem avisos.
- Gate documental `npm run repo:verificar`: organização e espelhos aprovados.
  Modo staged não aplicável: nenhum commit solicitado ou criado.

Dois testes RV-01 falharam antes da implementação (projeção ausente) e passaram
depois. Execuções inicialmente limitadas por `spawn EPERM` foram repetidas com
aprovação de execução local; opção incompatível de Vitest foi removida.
Os logs dos gates ficam junto das capturas, sem despejá-los na documentação.

## Limites e alterações simultâneas

Após a suíte completa aprovada, outra tarefa alterou a abertura dos Markdown,
`RegrasAbertura` e a normalização correspondente. Alterações preservadas. Uma
reexecução de `normalizar-regras.test.mjs` apresentou 24/25 aprovados: a fixture
literal `tarja.md` deixou de corresponder à abertura vigente. A tarefa simultânea
ajustou a fixture; a reexecução final aprovou 25/25, com log
`normalizador-final.log`. Nenhuma alteração alheia foi revertida. `git diff --check`
do recorte passa; a árvore completa aponta espaço final na abertura do Sistema,
fora desta task.

RV-01/P-114 verificado; RV-02…10/P-115…123 continuam abertos. Este relatório não
certifica PDF, bases de tema ou a auditoria inteira como corrigidos.
