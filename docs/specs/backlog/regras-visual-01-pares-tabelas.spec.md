# Preservar associações nas tabelas com dois pares

> Task de correção RV-01 / P-114; prioridade alta. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Em 360×800, consultar Formação, Níveis e Melhorias de Agente, Corpo e Pontuação Corporal e Treinamentos. Rolar cada tabela até a direita. A primeira coluna continua fixa, mas o valor exibido pertence ao segundo par: “Nenhum” acompanha o bônus de “Profissional”, e “00” acompanha o bônus de “11”.

## Fonte de verdade e responsabilidade

Sistema: tabelas Grupo/Bônus/Grupo/Bônus, Nível/Bônus/Nível/Bônus, Pontuação/Dano/Pontuação/Dano e Treinamento/Bônus/Treinamento/Bônus. Renderização em `regras-tabela.component.*` e classificação no normalizador.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Reconhecer os quatro recortes como pares independentes, sem tratar a primeira chave como identificador de toda a linha.
2. Manter cada grupo/nível/pontuação/treinamento junto de seu próprio bônus/dano em qualquer posição horizontal. A opção de apresentação pode ser tabela reorganizada ou sequência de pares usando os padrões existentes.
3. Preservar todos os registros, sua ordem lógica e valores da fonte, incluindo o último registro sem correspondente na outra metade. Não duplicar nem completar células vazias.
4. Conferir explicitamente `00 → INICIAL`, `11 → bônus de 11`, `Nenhum → INICIAL`, `Profissional → bônus de Profissional`, pontuação inferior a zero e `8 e 9`, além de Combate/Equipamento/Logística.
5. Manter busca, destaque e âncoras. Tabelas genuinamente relacionais, como Prestígio e Patentes, conservam suas associações.

## Contrato visual e verificação

Análogo inicial: Tabela de regras com chave e valor correspondentes; cartões de Amplificadores, que mantêm nome e efeito juntos no mobile. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Testar a classificação/projeção dos quatro pares e suas células vazias; comparar todos os pares com o Markdown. Observar início, meio e fim da rolagem local, todas as linhas e pesquisa em uma célula de cada metade.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-01-pares-tabelas/`, ao lado desta spec; capturas em `.artifacts/regras-visual-01-pares-tabelas/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
