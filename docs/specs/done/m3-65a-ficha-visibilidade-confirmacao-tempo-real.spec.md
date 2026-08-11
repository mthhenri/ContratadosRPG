# m3-65a — Confirmação e tempo real da visibilidade da ficha

## Objetivo

Simplificar o controle de ocultar/exibir na visualização completa da ficha, exigir confirmação antes da mudança e atualizar automaticamente os painéis abertos da campanha quando a visibilidade mudar.

## Escopo

1. Na ficha completa editável, substituir o checkbox por uma ação compacta com ícone e label dinâmico `Ocultar`/`Exibir`: botão junto ao avatar no desktop e item no menu de ações no mobile, sem overflow.
2. `Ocultar` abre uma dialog com o aviso de que outros jogadores deixarão de ver a ficha, enquanto dono e mestre manterão acesso.
3. `Exibir` abre uma dialog com o aviso de que a ficha voltará a aparecer para os outros jogadores da campanha.
4. Cancelar ou fechar a dialog não altera estado nem emite ajuste. Confirmar usa o fluxo existente de persistência da ficha.
5. Quando `oculta` realmente mudar em uma ficha vinculada a campanha, o backend emite `ficha:visibilidade-alterada` na sala `campanha:<id>`, somente após persistir.
6. O payload contém apenas `fichaId` e `campanhaId`; não expõe `oculta`, nome, dono ou `dados`.
7. O detalhe da campanha reage ao evento refazendo a listagem REST autorizada de membros e fichas. Ocultar remove e exibir recoloca a ficha para os demais jogadores sem F5.

## Critérios de aceite

- Os dois estados da ação têm ícone, label, tooltip e nome acessível coerentes com a ação futura.
- O controle só aparece quando a identidade da ficha pode ser editada em modo amplo.
- As duas dialogs usam as mensagens aprovadas, têm `Cancelar` e ação primária específica.
- O evento dedicado só é emitido quando o booleano persistido muda e não é emitido para ficha solta no acervo.
- Gateway e cliente usam DTO compartilhado em `shared/src/dtos/ficha/`.
- Testes focados, suítes amplas e builds passam; falhas preexistentes são registradas separadamente.
- A aplicação real é inspecionada em `1920×1080` e `360×800` nos dois estados e nas duas dialogs.
- Com mestre e jogador conectados, ocultar e exibir atualizam o painel do outro usuário sem reload.
