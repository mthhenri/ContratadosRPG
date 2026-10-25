# publicar-v1-12-0.spec.md

> Task avulsa: autor aprovou v1.12.0 e envio a produção após revisar o escopo nesta conversa.

## Objetivo

Publicar a v1.12.0 com as mudanças posteriores à v1.11.0, incluindo exportação dos livros, e conferir o produto em produção.

## Entregáveis

1. Nota em português para jogadores, mestres e administração; mesma versão na raiz, nos workspaces, no lock e na constante gerada.
2. Validação da nota, sincronização, testes de shared, builds proporcionais e verificações do repositório.
3. Commit com coautoria e push autorizado em master, acionando os pipelines existentes de notas, API e frontend.
4. Relatório adjacente com resultados, URLs, revisão publicada, tag e limites da inspeção.

## Critérios de Aceite

- Nota validada pelos comandos oficiais; versões alinhadas; checks aprovados antes do envio.
- Workflow publica a nota e cria v1.12.0; API pública informa 1.12.0; frontend de produção apresenta a versão e a nota.
- Evidência de conclusão dos pipelines ou pendência explicitamente registrada; não confundir push com deploy concluído.

## Fora de Escopo

Reset ou seed em produção, alterações das regras e conteúdo dos livros, nova funcionalidade ou mudança da infraestrutura de deploy.

## Dependências

Skill publicar-versao, docs/patchnotes/1.11.0.md, cloudbuild.yaml e .github/workflows/versao.yml.
