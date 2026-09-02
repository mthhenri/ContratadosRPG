# espectadores-04-preview-jogador-fidedigno.spec.md

> Task 4/5 do módulo `espectadores-campanha.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`. O análogo aprovado é a própria visão de
> jogador de `CampanhaDetalhe` (`m2-20`/`m2-21`): shell, densidade, navegação, responsividade e
> estados devem ser os mesmos; a faixa de prévia segue o padrão de contexto/somente leitura já
> usado no projeto, sem inventar outra página administrativa.

## Objetivo

Trocar “Ver como jogador” por uma prévia que seja útil para o mestre conferir a experiência de um
jogador específico: os dados e as capacidades vêm do recorte do alvo, e não dos privilégios de
quem está olhando.

## Entregáveis

1. Substituir a ação atual por “Prévia de jogador”. O mestre escolhe apenas membros `JOGADOR`
   ativos; selecionar um abre rota dedicada de prévia. Espectadores e o próprio mestre não são
   alvos dessa ação.
2. A rota consome exclusivamente a projeção de alvo de `espectadores-02`. A composição reutiliza
   os mesmos componentes e os mesmos ramos da visão normal de jogador (ficha própria, fichas
   concedidas, Rolagens e Sessão), sem montar uma cópia de markup com dados carregados como mestre.
3. Inserir uma barra persistente “Visualizando como <nome> · prévia somente leitura” e uma ação
   clara para sair. Os controles aparecem no estado que o jogador veria, mas não efetuam mutação:
   handlers de escrita/rolagem não são conectados, e o backend permanece a segunda barreira.
4. A prévia reage a atualizações públicas em tempo real e pode recarregar a projeção quando evento
   de membro/ficha altera o que o alvo poderia ver. Ela não mostra códigos, ações de mestre,
   rolagens privadas de outro usuário, anotações/campos privados ou uma ficha sem acesso do alvo.
5. Remover o mecanismo atual de `previewJogador` que apenas alterna signals dentro da página de
   mestre e bloqueia `pointer-events`. Seus testes são substituídos por cenários que provam o
   recorte de dados e a inércia de ações, não somente a presença de uma barra visual.
6. Testes de backend/frontend cobrem pelo menos: jogador com ficha própria, jogador sem ficha,
   ficha de colega concedida, ficha de colega oculta, rolagem privada de terceiro e retorno à visão
   de mestre. Os testes verificam que nenhum submit/mutação sai da prévia.

## Critérios de Aceite

- O mestre pode confrontar a prévia com uma sessão real do jogador e encontra a mesma lista de
  fichas e o mesmo feed permitido, exceto pela faixa explícita de prévia e pela inércia das ações.
- Uma ficha que só o mestre vê não é enviada à prévia de um jogador sem concessão.
- Clicar/teclar qualquer controle que seria mutável não provoca chamada REST nem emissão de socket.
- Em execução real, mestre entra/sai da prévia, alterna um alvo sem ficha e outro com ficha
  compartilhada em `1920×1080` e `360×800`; a página preserva densidade, foco, responsividade e
  ausência de overflow do análogo.

## Fora de Escopo

- Trocar token/JWT ou navegar como o usuário fora desta campanha; isso seria impersonação, não
  prévia.
- Prévia de espectador para jogador comum; só mestre possui a ação de controle de campanha.
- Novas permissões de ficha ou mudanças no layout normal do jogador que não sejam necessárias para
  compartilhar o componente/projeção.

## Dependências

- `espectadores-02-backend-permissoes-projecoes` e
  `espectadores-03-frontend-painel-visualizador`.
- `m2-20-painel-campanha-detalhe-jogador`, `m2-21-painel-jogador-abas-ficha` e
  `m3-51-permissoes-granulares-acesso`.
- `docs/design/DESIGN.md` e skill `verify`.

## Riscos e mitigação

- Bloquear o container com CSS é insuficiente: a prévia não recebe callbacks de escrita e usa
  projeção do servidor; o bloqueio visual é somente defesa de usabilidade adicional.
