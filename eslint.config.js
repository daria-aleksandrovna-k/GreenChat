import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities']

/** Layer → layers it may import from (FSD) */
const LAYER_IMPORTS = [
  ['app', ['pages', 'widgets', 'features', 'entities', 'shared']],
  ['pages', ['widgets', 'features', 'entities', 'shared']],
  ['widgets', ['features', 'entities', 'shared']],
  ['features', ['entities', 'shared']],
  ['entities', ['shared']],
  ['shared', ['shared']],
]

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.app.json' } },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        ...SLICED_LAYERS.map((layer) => ({
          type: layer,
          pattern: `src/${layer}/*`,
          capture: ['slice'],
        })),
        { type: 'shared', pattern: 'src/shared/*', capture: ['segment'] },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: LAYER_IMPORTS.map(([from, targets]) => ({
            from: { element: { type: from } },
            // Imports only from lower layers and only through the public API (index.ts)
            allow: {
              to: { element: { types: { anyOf: targets }, fileInternalPath: 'index.{ts,tsx}' } },
            },
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
  },
  prettier,
)
