# montador-rolagem-cobertura-telas.spec.md

> Spec avulsa. Pedido do autor em 2026-10-14: o montador de rolagem "deveria funcionar em todos os
> lugares" — visão do jogador, visão do mestre, fichas parciais etc.

> Escopo autorizado em 22/10/2026: verificar jogador, criatura e NPC; adicionar o rolador avulso do mestre nas cenas com e sem iniciativa; corrigir P-135; executar a matriz visual. As decisões (a) e (b) estão autorizadas neste recorte. A cobertura usa apenas o montador Completo, como jogador NORMAL; versões antigas e gate estão aposentados.

## Objetivo

As superfícies de fórmula livre enumeradas nesta spec oferecem o montador, e ele funciona (abre,
monta, rola, registra no histórico) igual em todas elas — usando o Completo, sem gate de tester.

## Situação atual (levantada em 2026-10-14)

- O montador vive no `RolagemRapida` (`modules/ficha/componentes/rolagem-rapida/`), que escolhe entre
  `MontadorRolagem` (Atual) e `MontadorRolagemExperimental` (Essencial/Completo/Blocos) e aplica o gate
  único `podeUsarMontador` (TESTER/ADMIN) — experimento guarda-chuva em
  `docs/specs/done/montador-rolagem-experimento.spec.md`, à espera da avaliação do autor.
- Consumidores do `RolagemRapida`: `ficha-rolagens` (usado em `ficha-visualizacao`, `ficha-campanha-card`,
  `ficha-rolagens-painel`, `detalhe-jogador`), `criatura-visualizacao` e `detalhe-mestre` (rolagem do
  mestre na campanha).
- Superfícies **sem** montador encontradas: `rolagem-avulso` do encontro (painel do mestre — campo de
  expressão próprio com `app-guia-formula`); a ficha de NPC não tem Rolagem rápida.
- O defeito exato "não funciona" em cada tela não foi reproduzido nesta triagem (sem rodar o app);
  `ficha-campanha-card` tem modos compactos (`mostrarRolagensCompacto`, `mostrarTopo`) que podem esconder ou
  quebrar o gatilho/painel — suspeita principal para as "fichas parciais".

> **Atualização de 2026-10-20:** o experimento foi fechado (`done/montador-rolagem-fechamento.spec.md`): o Completo é o
> único montador e vale para todos; não existe mais gate de TESTER/ADMIN, seletor nem as versões Atual/Essencial/Blocos
> citadas abaixo. A decisão (c) está respondida (gate removido); a auditoria passa a ser feita como jogador comum.

## Entregáveis

1. **Auditoria ao vivo** (anexo `auditoria.md`): para cada tela — ficha completa (jogador, criatura, NPC),
   card da ficha no Esquadrão (jogador e mestre), ficha flutuante, Investigação do jogador
   (`painel-sem-iniciativa-jogador`), Iniciativa do jogador e do mestre, rolagem do mestre na campanha,
   rolagem avulsa do encontro, janela externa — registrar se há campo de fórmula, se o montador aparece,
   e se abrir/montar/rolar/registrar funciona no montador Completo, como jogador comum e como mestre.
2. Corrigir as falhas de **funcionamento** encontradas onde o `RolagemRapida` já está (posicionamento do
   painel flutuante, gatilho escondido em modo compacto, rolar sem ficha/combatente etc.), com causa raiz
   registrada.
3. Decisões autorizadas pelo autor em 22/10/2026: (a) `rolagem-avulso` do encontro recebe o montador,
   preservando validação sem atributos, autoria e confirmação de visibilidade; (b) NPC recebe Rolagem
   rápida privada; cenas com/sem iniciativa recebem rolador avulso do mestre, sem ficha/combatente.
   A decisão (c), remoção do gate de tester, já foi entregue no fechamento do experimento.
4. Testes de componente para cada correção e para o gate continuar centralizado (nenhum consumidor novo
   reintroduz restrição local).

## Critérios de Aceite

- Auditoria com todas as telas acima e o resultado de cada uma; nenhuma tela com montador quebrado ao fim.
- Testes do frontend dos arquivos tocados verdes; `npm run test --workspace=shared` sem regressão (o motor
  de rolagem não muda); lint e build.
- Gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800` em cada tela corrigida, análogo: a
  Rolagem rápida da ficha completa; rolagem aparece na bandeja e no histórico do outro usuário.
  `npm run repo:verificar`.

## Fora de Escopo

Escolher o montador final, mudar a gramática de fórmulas, mudar o comportamento interno das versões.

## Dependências

`montador-rolagem-experimento.spec.md` (`done/`); `ui-35`/`ui-36` (`done/`).

## Fecho — 22/10/2026

Entregue e verificado na aplicação real. Auditoria, causas das falhas corrigidas, mapa de impacto,
matriz de 48 combinações de superfícies/resoluções, testes e limites em
[auditoria.md](montador-rolagem-cobertura-telas/auditoria.md). P-135 removido dos problemas ativos.
