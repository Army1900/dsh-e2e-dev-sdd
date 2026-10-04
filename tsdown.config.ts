import { defineConfig } from 'tsdown'

const PACKAGE_ID = 'dsh-e2e-dev-sdd'
/**
 * Modules the DSH 0.2 web shell seeds in its static module table
 * (`createClientModuleSystem({ staticModules })`). They must stay external so the
 * browser resolves the shell's single React/Cordis instance instead of a bundled copy.
 */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
] as const

export default defineConfig([
  {
    name: `${PACKAGE_ID}/host`,
    entry: ['src/index.ts', 'src/protocol.ts', 'src/extensions.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    external: ['@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-host-webserver'],
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...PLATFORM_MODULES],
    noExternal: (id: string) => (PLATFORM_MODULES.includes(id as never) ? undefined : true),
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
