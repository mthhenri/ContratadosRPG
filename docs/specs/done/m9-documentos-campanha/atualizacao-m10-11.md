# Atualização posterior — M10-11, 08/10/2026

A M9 previa reutilizar o leitor de regras para documentos PDF futuros da
Biblioteca. A M10-11 retirou esse leitor, a dependência de renderização, os
arquivos e o pipeline antigo. A leitura das Regras passa exclusivamente por
Markdown canônico e JSON gerado; a exportação nativa tem infraestrutura própria.

A Biblioteca atual continua atendendo texto e imagens. Acrescentar outro formato
exige uma decisão e especificação novas, registradas como I-058 em `IDEAS.md`.
Esse registro substitui a premissa operacional de reuso, preservando os
requisitos e decisões da spec histórica da M9.
