# Verificação — ícones de classe e arquétipo

Data: 2026-10-20. Decisões do autor: sem ícone de tipo; classe-base + arquétipo/subclasse; Civil sozinho; alcance em
todas as telas onde a identidade aparece (decisão de 20/10, [spec](../icones-identidade-cards-agente.spec.md)).

## O que foi entregue

- `iconesIdentidade(classe, arquetipo)` e os mapas `ICONE_CLASSE`/`ICONE_ARQUETIPO` em `shared/icone/icones-dominio.ts`
  (mesma divisão de `perfilClasseRotulos`); o leitor de Regras (`regras-identidade-icone.ts`) delega aos mapas sem mudar
  o que exibe.
- `app-identidade-classe` (`modules/ficha/componentes/identidade-classe/`): texto "Classe - Arquétipo" com o ícone de
  cada parte e `appTooltip`; o ícone acompanha o nome quando ele quebra de linha.
- Aplicado em: ficha completa e card da campanha (chips e linha do HUD mobile, com `iconesClasse`), cartão do Esquadrão
  (`espectador-ficha-card`, mestre/espectador), Esquadrão do jogador (`detalhe-jogador`), carteirinhas do mestre
  (`detalhe-mestre`), Investigação (`esquadrao-cena-jogador`), Acervo (`cartao-ficha-acervo`), seletor de combatentes e
  cartão/resumo do combatente no encontro (só agente de identidade visível; `classeVisivelDoCombatente`).
  Contratos: `ItemFicha`/teaser e `ItemAcervo` ganham `classe` e `arquetipo`; o NPC do `espectador-ficha-card` segue só
  com texto.

## Verificado

- Testes: suíte do frontend inteira verde (3579), incluindo `icones-dominio`, `identidade-classe` e os specs ajustados;
  ESLint do frontend sem erro; `repo:verificar` ok.
- Ao vivo (Playwright, app real, dados descartáveis): ficha completa (Combatente·Lutador, Experimento Bestial, Civil),
  Acervo, painel do mestre (Esquadrão), cartão do combatente no encontro, em `1920×1080` e `360×800`; tema claro nos
  chips. Achados corrigidos na inspeção: chips sem respiro entre ícone e nome; ícone sozinho na linha quando o nome
  quebra no card estreito do mobile. Sem overflow horizontal nem erro de console.

## Limites

- Sem captura ao vivo das telas que exigem outro usuário (Esquadrão do jogador e Investigação) e do seletor de
  combatentes; cobertas por teste de componente.
- Ícone de NPC e de criatura fica fora (não há glifo de criatura): ver `I-063` em `docs/context/IDEAS.md`.
