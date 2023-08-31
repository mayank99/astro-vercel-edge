import esbuild from 'esbuild';
import { relative as relativePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defaultImageConfig, getImageConfig, throwIfAssetsNotEnabled, } from './image.js';
import { exposeEnv } from './lib/env.js';
import { copyFilesToFunction, getFilesFromFolder, getVercelOutput, removeDir, writeJson, } from './lib/fs.js';
import { getRedirects } from './lib/redirects.js';

const PACKAGE_NAME = '@astrojs/vercel/edge';

function getAdapter() {
    return {
        name: PACKAGE_NAME,
        serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
        exports: ['default'],
        supportedAstroFeatures: {
            hybridOutput: 'stable',
            staticOutput: 'unsupported',
            serverOutput: 'stable',
            assets: {
                supportKind: 'unstable',
                isSharpCompatible: true,
                isSquooshCompatible: true,
            },
        },
    };
}

export default function vercelEdge({ includeFiles = [], analytics, imageService, imagesConfig, } = {}) {
    let _config;
    let buildTempFolder;
    let functionFolder;
    let serverEntry;

    return {
        name: PACKAGE_NAME,
        hooks: {
            'astro:config:setup': ({ command, config, updateConfig, injectScript }) => {
                if (command === 'build' && analytics) {
                    injectScript('page', 'import "@astrojs/vercel/analytics"');
                }
                const outDir = getVercelOutput(config.root);
                const viteDefine = exposeEnv(['VERCEL_ANALYTICS_ID']);
                updateConfig({
                    outDir,
                    build: {
                        serverEntry: 'entry.mjs',
                        client: new URL('./static/', outDir),
                        server: new URL('./dist/', config.root),
                    },
                    vite: {
                        define: viteDefine,
                        ssr: {
                            external: ['@vercel/nft'],
                        },
                        build: { rollupOptions: { output: { hoistTransitiveImports: false } } },
                    },
                    ...getImageConfig(imageService, imagesConfig, command),
                });
            },
            'astro:config:done': ({ setAdapter, config }) => {
                throwIfAssetsNotEnabled(config, imageService);
                setAdapter(getAdapter());
                _config = config;
                buildTempFolder = config.build.server;
                functionFolder = new URL('./functions/render.func/', config.outDir);
                serverEntry = config.build.serverEntry;

                if (config.output === 'static') {
                    throw new Error(`
		[@astrojs/vercel] \`output: "server"\` or \`output: "hybrid"\` is required to use the edge adapter.

	`);
                }
            },
            'astro:build:setup': ({ vite, target }) => {
                if (target === 'server') {
                    vite.resolve ||= {};
                    vite.resolve.alias ||= {};

                    const aliases = [{ find: 'react-dom/server', replacement: 'react-dom/server.browser' }];

                    if (Array.isArray(vite.resolve.alias)) {
                        vite.resolve.alias = [...vite.resolve.alias, ...aliases];
                    }
                    else {
                        for (const alias of aliases) {
                            vite.resolve.alias[alias.find] = alias.replacement;
                        }
                    }

                    vite.ssr ||= {};
                    vite.ssr.target = 'webworker';

                    // Vercel edge runtime is a special webworker-ish environment that supports process.env,
                    // but Vite would replace away `process.env` in webworkers, so we set a define here to prevent it
                    vite.define = {
                        'process.env': 'process.env',
                        ...vite.define,
                    };
                }
            },
            'astro:build:done': async ({ routes }) => {
                const entry = new URL(serverEntry, buildTempFolder);
                const generatedFiles = await getFilesFromFolder(buildTempFolder);
                const entryPath = fileURLToPath(entry);

                await esbuild.build({
                    target: 'es2021',
                    platform: 'browser',
                    // https://runtime-keys.proposal.wintercg.org/#edge-light
                    conditions: ['edge-light', 'worker', 'browser'],
                    entryPoints: [entryPath],
                    outfile: entryPath,
                    allowOverwrite: true,
                    format: 'esm',
                    bundle: true,
                    minify: false,
                    external: ['sharp', 'detect-libc'],
                });

                // Copy entry and other server files
                const commonAncestor = await copyFilesToFunction([...generatedFiles, ...includeFiles.map((file) => new URL(file, _config.root))], functionFolder);

                // Remove temporary folder
                await removeDir(buildTempFolder);

                // Edge function config
                // https://vercel.com/docs/build-output-api/v3#vercel-primitives/edge-functions/configuration
                await writeJson(new URL(`./.vc-config.json`, functionFolder), {
                    runtime: 'edge',
                    entrypoint: relativePath(commonAncestor, entryPath),
                });

                // Output configuration
                // https://vercel.com/docs/build-output-api/v3#build-output-configuration
                await writeJson(new URL(`./config.json`, _config.outDir), {
                    version: 3,
                    routes: [
                        ...getRedirects(routes, _config),
                        {
                            src: `^/${_config.build.assets}/(.*)$`,
                            headers: { 'cache-control': 'public, max-age=31536000, immutable' },
                            continue: true,
                        },
                        { handle: 'filesystem' },
                        { src: '/.*', dest: 'render' },
                    ],
                    ...(imageService || imagesConfig
                        ? { images: imagesConfig ? imagesConfig : defaultImageConfig }
                        : {}),
                });
            },
        },
    };
}
