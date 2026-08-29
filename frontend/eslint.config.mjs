// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'out-tsc', '.angular', 'eslint.config.mjs'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      // `attribute` liberado (ui-01) só para os primitivos de `shared/ui` que precisam vestir o
      // elemento nativo do consumidor em vez de embrulhá-lo — `<button app-botao>`, no padrão do
      // `<button matButton>`. Sem isso, cada botão ganharia um nó a mais dentro de containers
      // flex/grid com `gap`. O prefixo `app` continua obrigatório nos dois tipos.
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'app', style: 'kebab-case' },
      ],
      quotes: ['warn', 'double', { avoidEscape: true }],
      semi: ['warn', 'always'],
      'max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
