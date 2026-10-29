# ficha-exportar-criatura-npc-agente.spec.md

> Task avulsa de exportação do M3/M4. Origem: pedido do autor (2026-10-29), anotado como trabalho
> decidido. Estende `m3-53-ficha-exportar-pdf.spec.md`, que cobre só o PDF do Agente e deixa Criatura e
> NPC de fora.

## Objetivo

Permitir exportar a ficha de **Agente** (jogador), **Criatura** e **NPC** em quatro formatos:
**PDF preenchido**, **PDF de ficha vazia** (modelo para imprimir), **Markdown** e **HTML**. A exportação
respeita quem pode ver cada ficha e os campos privados.

## Entregáveis

1. **Decisão de arquitetura antes de codar** (registrar nesta spec):
   - Markdown e HTML gerados por função pura em `shared/` a partir do DTO da ficha, para que a saída seja
     a mesma no frontend e no backend e não haja recálculo no template.
   - PDF pela mesma abordagem decidida na `m3-53` (print de rota dedicada ou lib sem servidor); se a
     `m3-53` for implementada antes, reaproveitar o layout dela.
2. **Exportação preenchida** dos três tipos, com as seções de cada ficha (Agente: identidade, atributos,
   derivados, resistências, habilidades, inventário, sanidade, origem/personalidade; Criatura e NPC:
   identidade, VD/Tenacidade/Defesa, atributos com modificadores, habilidades, ataques, sequelas/traumas
   e anotações do mestre quando permitidas).
3. **Ficha vazia (modelo)** para Agente, Criatura e NPC: mesmo layout, sem dado de ficha real, para
   preenchimento à mão. Não exporta nome, anotação ou valor de nenhuma ficha existente.
4. **Markdown e HTML** de cada tipo, preenchidos ou vazios. O HTML é autocontido (CSS embutido, sem
   dependência externa).
5. **Ações "Exportar"** nas telas de visualização (menu da ficha) e no acervo, com a escolha do formato e
   a opção "ficha vazia". Nome do arquivo baseado no nome da ficha.
6. **Privacidade:** o que não é visível para o usuário não entra no arquivo. Criatura e NPC pertencem ao
   mestre e ficam ocultos até serem compartilhados; o jogador só exporta fichas às quais tem acesso
   (`usuario_ficha_acesso`). Anotações privadas só para dono/mestre (gate da `m3-50`/`m3-51`).

## Critérios de Aceite

- Para cada combinação tipo × formato (3 × 4), o arquivo abre e reproduz os valores exibidos na ficha
  (mesma fonte `shared/regras`), inclusive os modificadores de Criatura/NPC após o recálculo por VD.
- Ficha vazia: o arquivo não contém nenhum nome, valor ou anotação de ficha real (checar por busca de um
  nome de teste no arquivo gerado).
- Permissão: jogador sem acesso não consegue exportar NPC ou criatura oculta (teste de API e de tela);
  jogador sem permissão não recebe anotação privada no arquivo.
- HTML e Markdown: sem dependência externa; Markdown renderiza no visualizador padrão.
- Gate visual com a skill `verify` nos viewports `1920×1080` e `360×800` para o botão de exportação e para
  o PDF/HTML gerado, comparando com o análogo aprovado da tela de ficha.
- `npm run test --workspace=shared` e `npm run test --workspace=backend` verdes; `npm run repo:verificar` sem alerta.

## Fora de Escopo

- Templates alternativos ou layout customizável pelo usuário (um layout canônico por tipo).
- Importação de Markdown/HTML de volta para a ficha.
- Exportação de Caderno ou de Guia (`I-022` em `IDEAS.md`).

## Dependências

- `m3-53-ficha-exportar-pdf.spec.md` (backlog): decisão de layout e de PDF; esta spec a estende.
- `ficha-avatar-leitura-autorizada.spec.md` e a leitura de permissão de `usuario_ficha_acesso` (M3/M4 concluídos).
- Consultar `docs/design/DESIGN.md` e o tema `docs/design/tema/` antes de qualquer UI.

## Riscos e Mitigação

- **Vazamento de dado privado:** o risco maior. Testar a exportação com usuário sem permissão, não só
  com o dono.
- **Modelo vazio com resíduo:** um campo com valor padrão de uma ficha real pode vazar. Gerar o modelo a
  partir de um DTO zerado, nunca a partir de uma ficha existente.
