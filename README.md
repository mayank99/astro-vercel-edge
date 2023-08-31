# astro-vercel-edge

A fork of `@astrojs/vercel/edge` created to deploy Astro v3 on Vercel Edge Functions. See [discussion](https://github.com/withastro/roadmap/discussions/631) for why this fork was needed.

```
npm add astro-vercel-edge
```

The API is backwards compatible, so only the package name needs to be changed if coming from `@astrojs/vercel/edge`.
```diff
- import vercel from '@astrojs/vercel/edge';
+ import vercel from 'astro-vercel-edge';
```

Your config file should look like something this:
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from 'astro-vercel-edge';

export default defineConfig({
 output: 'server',
 adapter: vercel(),
});
```

---

### Targets

This adapter is for SSR inside [Edge functions](https://vercel.com/docs/concepts/functions/edge-functions) (along with some prerendered routes if using [hybrid mode](https://docs.astro.build/en/guides/server-side-rendering/#configuring-individual-routes)).

For [serverless Node.js functions](https://vercel.com/docs/concepts/functions/serverless-functions), use [`@astrojs/vercel`](https://docs.astro.build/en/guides/integrations-guide/vercel/).

For static sites, you don't need an adapter.

> **Note**
> Deploying to the Edge has [its limitations](https://vercel.com/docs/concepts/functions/edge-functions#known-limitations). An edge function can't be more than 1 MB in size and they don't support native Node.js APIs, among others.

## Usage

📚 Deployment works exactly the same as the Vercel serverless adapter. [Read the serverless deployment guide here.](https://docs.astro.build/en/guides/deploy/vercel/)

You can deploy by CLI (`vercel deploy`) or by connecting your new repo in the [Vercel Dashboard](https://vercel.com/). Alternatively, you can create a production build locally:

```sh
astro build
vercel deploy --prebuilt
```

## Configuration

To configure this adapter, pass an object to the `vercel()` function call in `astro.config.mjs`:

### analytics

You can enable [Vercel Analytics](https://vercel.com/analytics) (including Web Vitals and Audiences) by setting `analytics: true`. This will inject Vercel’s tracking scripts into all your pages.

```js
export default defineConfig({
  output: 'server',
  adapter: vercel({
    analytics: true,
  }),
});
```

### imagesConfig

Configuration options for [Vercel's Image Optimization API](https://vercel.com/docs/concepts/image-optimization). See [Vercel's image configuration documentation](https://vercel.com/docs/build-output-api/v3/configuration#images) for a complete list of supported parameters.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    imagesConfig: {
      sizes: [320, 640, 1280],
    },
  }),
});
```

### imageService

When enabled, an [Image Service](https://docs.astro.build/en/reference/image-service-reference/) powered by the Vercel Image Optimization API will be automatically configured and used in production. In development, a built-in Sharp/Squoosh-based service will be used instead.

```js
export default defineConfig({
  output: 'server',
  adapter: vercel({
    imageService: true,
  }),
});
```

```astro
---
import { Image } from 'astro:assets';
import astroLogo from '../assets/logo.png';
---

<!-- This component -->
<Image src={astroLogo} alt="My super logo!" />

<!-- will become the following HTML -->
<img
  src="/_vercel/image?url=_astro/logo.hash.png&w=...&q=..."
  alt="My super logo!"
  loading="lazy"
  decoding="async"
  width="..."
  height="..."
/>
```

### includeFiles

Use this property to force files to be bundled with your function. This is helpful when you notice missing files.

```js
export default defineConfig({
  output: 'server',
  adapter: vercel({
    includeFiles: ['./my-data.json'],
  }),
});
```

> **Note**
> When building for the Edge, all the dependencies get bundled in a single file to save space. **No extra file will be bundled**. So, if you _need_ some file inside the function, you have to specify it in `includeFiles`.
