# M4-08b — verificação da ficha de NPC

Verificada em 2026-09-30 com a skill `verify`: Postgres, NestJS e Angular reais,
Chromium com barras de rolagem visíveis. Inspeção pessoal do agente principal.

## Referências e comparação

`CriaturaVisualizacao` para perfil/combate, duas colunas e Atributos;
`FichaVisualizacao` para recursos/edição; `CriaturaVisualizar` para shell, ações e histórico.
Os dois análogos foram observados no código e renderizados em desktop antes da implementação.

Mesma família visual: IBM Plex, índices, réguas, cartões, densidade de controles e cores
semânticas. Identidade/recursos e Atributos ficam à esquerda; detalhes em abas à direita.
Conteúdo empilha pela largura útil, inclusive com histórico. Não há overflow horizontal.
Foco e contraste foram inspecionados nas bases escura/clara. Alvos mobile de 44px: inclui
a área `::after` que o próprio `ValorEditavel` fornece, sem receita local de controle.

| Controle | API utilizada |
|---|---|
| Cartões | `Cartao`, título, índice projetado e `cabecalhoQuebravel` |
| Metadados e números | `Chip` sutil; `Stat` compacto, rótulo/valor/nota |
| Recursos | `BarraRecurso` padrão, atual/máximo/editável e eventos próprios |
| Nome | `ValorEditavel`, bloco, variante secundária e rótulo acessível |
| Formulários | `Campo` com controle projetado e Reactive Forms; `StepInput` compacto/discreto |
| Ações | `Botao` médio, variante/estilo; `BotaoIcone` padrão e nome acessível |
| Detalhes | `Abas`/`Aba`/`AbaPainel`, seleção e associação acessível |
| Utilitários | `ColunaAcoes`, histórico interno, calculadora e `PainelFlutuante`/`EditorMarkdown` |
| Feedback e acesso | `EstadoVazio` com ação projetada, `Esqueleto`, `Modal`, `ConfirmacaoService`, notificações |
| Retrato | Ajuste de enquadramento existente, foco genérico e upload pelo cliente HTTP existente |

## Cobertura observada

| Recorte | 1920×1080 | 1366×768 | 960×1080 | 360×800 |
|---|---|---|---|---|
| Cinco Categorias e recursos por modelo | Sim | Sim | Sim | Sim |
| Histórico aberto e listas vazias | Sim | Sim | Sim | Sim |
| Nome/função extensos, oito habilidades e sanidade longa | Sim | Sim | Sim | Sim |
| Abas de Habilidades, Conduta e Sanidade | Sim | Sim | Sim | Sim |

Percorridos também edição de identidade/Cooperação/atributos, listas com Adicionar/Concluir,
salvar/reabrir, erro de carga com retry, erro de gravação preservando rascunho e envio ocupado.
Tema claro e foco em desktop/mobile; Civil com Luta/Pontaria autorizadas; faixas de Cooperação
0/1/2/4/7/10; Vida negativa ativa Morrendo, cura mantém e socorro explícito remove com Vida positiva.
Recursos atuais acima do máximo são preservados. Categoria/atributos não recalculam snapshots.

Dois usuários autenticados: jogador sem concessão recebe 403; mestre concede pelo diálogo;
leitor não recebe anotações nem controles de gestão; alteração chega sem F5; revogação limpa
e redireciona imediatamente. Sentinela no navegador comprovou ausência de recarga.
Espectador foi recusado por rota direta e não apareceu no seletor de concessão.
Entradas do acervo e painel abriram `/fichas/npc/:id` e `/campanhas/:id/npc/:id`.
Saída dos dois assistentes foi coberta pelos testes de rota.

Anotações foram editadas e gravadas, inclusive o último texto do editor; cor ficou no metadado
genérico; retrato foi enviado, reenquadrado e removido usando a API existente.
Reconexão real: API interrompida, Cooperação alterada direto no Postgres, API reiniciada;
GET recuperou o valor sem broadcast de ficha e sem F5. O supervisor não reiniciou por simples
alteração de timestamp; foi necessário restaurar explicitamente o executável local.

## Correções durante a inspeção

Retrato passou a usar o botão canônico em vez do controle nativo visível; ações tiveram a
largura ajustada ao seu papel. Cor ausente deixou de adotar uma cor por efeito do input.
Estado de erro recebeu o slot `estadoVazioAcao`; nome muito longo deixou de esmagar o rótulo
da campanha, que agora conserva largura e usa reticências. Respostas antigas são invalidadas
após perda de acesso. Remoção remota de campos opcionais não reaparece no editor seguinte.

## Gates e limites

- `npm run test --workspace=shared`: 889 testes passaram.
- `npm run test --workspace=backend`: 948 passaram, um skip já existente.
- `npm run test --workspace=frontend -- --watch=false`: integração com 2.682 testes passando.
- Regressão final do frontend, nove arquivos pertinentes: 54 testes passaram, incluindo
  o caso adicional de campos opcionais removidos. Não houve mudança funcional posterior.
- Builds de shared, backend e frontend passaram. Frontend: aviso preexistente P-004
  (555,92 kB frente ao orçamento de aviso de 450 kB).
- `npm run lint`: zero erros nos três workspaces, avisos legados. Lint do código novo e dos
  componentes de criação tocados: zero erros/avisos depois do passe final.
- Checagem global `tsc --noEmit -p shared/tsconfig.json`: falha preexistente P-092,
  `derivados.spec.ts:129`, campo `uid` em `CarrinhoItemDto`. Build e suíte shared passam.
- Diff completo e arquivos novos revisados contra spec, convenções, fontes de domínio e UI;
  sem DTO/enums redefinidos, fórmulas locais, gateway novo ou cores/fontes/raios hardcoded.

Nenhum gate obrigatório da M4-08b permanece aberto. Listagem/revelação integrada e atalhos
de criação/filtro do acervo pertencem à M4-09; refinamento mobile complementar, à M4-10.
Capturas e logs locais ficam em `.superpowers/m4-08b-*` e não são arquivos de produto.
