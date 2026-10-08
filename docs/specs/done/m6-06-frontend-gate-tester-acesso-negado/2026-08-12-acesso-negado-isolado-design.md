# Acesso negado isolado — design

## Objetivo

Transformar `/acesso-negado` em um documento institucional isolado da Fundação, sem topbar,
com o logo oficial do site como selo, censura textual por `█`, retorno evidente ao painel e
mensagem visual variável a cada novo carregamento da página.

## Decisões

- O `Layout` reconhece a URL `/acesso-negado` e não renderiza topbar, toast, carregamento global
  nem utilitários flutuantes nessa rota. O `router-outlet` permanece como o único shell.
- O documento central cresce no desktop e mantém largura integral segura no mobile.
- `app-marca` substitui o ícone genérico de alerta como selo da Fundação SCP do universo.
- A censura usa o caractere `█` em sequências textuais, inclusive junto de “DADOS EXPURGADOS” e
  “REDACTED”; não depende de uma tarja CSS vazia.
- Um catálogo local de mensagens contém entre 12 e 20 variações institucionais. A página escolhe
  uma variação na construção; ela permanece estável durante a instância e muda potencialmente no F5.
- “Retornar ao painel” é uma ação primária de largura confortável, com ícone, borda e contraste.
- Não há alteração em guards, permissões ou backend.

## Verificação

- Testes unitários do `Layout` comprovam que a topbar não é renderizada em `/acesso-negado` e
  continua presente nas demais rotas.
- Testes da página comprovam catálogo, estabilidade da mensagem e presença de censura por `█`.
- A aplicação real será inspecionada em 1920×1080 e 360×800, confirmando identidade, ausência de
  overflow, alvo de toque e legibilidade do botão.
