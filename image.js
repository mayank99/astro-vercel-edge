export const defaultImageConfig = {
	sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
	domains: [],
};

export function isESMImportedImage(src) {
	return typeof src === 'object';
}

export const qualityTable = {
	low: 25,
	mid: 50,
	high: 80,
	max: 100,
};

// TODO: Remove once Astro 3.0 is out and `experimental.assets` is no longer needed
export function throwIfAssetsNotEnabled(config, imageService) {
	if (!config.experimental.assets && imageService) {
		throw new Error(
			`Using the Vercel Image Optimization-powered image service requires \`experimental.assets\` to be enabled. See https://docs.astro.build/en/guides/assets/ for more information.`
		);
	}
}

export function getImageConfig(
	images,
	imagesConfig,
	command
) {
	if (images) {
		return {
			image: {
				service: {
					entrypoint:
						command === 'dev'
							? '@astrojs/vercel/dev-image-service'
							: '@astrojs/vercel/build-image-service',
					config: imagesConfig ? imagesConfig : defaultImageConfig,
				},
			},
		};
	}

	return {};
}

export function sharedValidateOptions(
	options,
	serviceConfig,
	mode
) {
	const vercelImageOptions = serviceConfig;

	if (
		mode === 'development' &&
		(!vercelImageOptions.sizes || vercelImageOptions.sizes.length === 0)
	) {
		throw new Error('Vercel Image Optimization requires at least one size to be configured.');
	}

	const configuredWidths = vercelImageOptions.sizes.sort((a, b) => a - b);

	// The logic for finding the perfect width is a bit confusing, here it goes:
	// For images where no width has been specified:
	// - For local, imported images, fallback to nearest width we can find in our configured
	// - For remote images, that's an error, width is always required.
	// For images where a width has been specified:
	// - If the width that the user asked for isn't in `sizes`, then fallback to the nearest one, but save the width
	// 	the user asked for so we can put it on the `img` tag later.
	// - Otherwise, just use as-is.
	// The end goal is:
	// - The size on the page is always the one the user asked for or the base image's size
	// - The actual size of the image file is always one of `sizes`, either the one the user asked for or the nearest to it
	if (!options.width) {
		const src = options.src;
		if (isESMImportedImage(src)) {
			const nearestWidth = configuredWidths.reduce((prev, curr) => {
				return Math.abs(curr - src.width) < Math.abs(prev - src.width) ? curr : prev;
			});

			// Use the image's base width to inform the `width` and `height` on the `img` tag
			options.inputtedWidth = src.width;
			options.width = nearestWidth;
		} else {
			throw new Error(`Missing \`width\` parameter for remote image ${options.src}`);
		}
	} else {
		if (!configuredWidths.includes(options.width)) {
			const nearestWidth = configuredWidths.reduce((prev, curr) => {
				return Math.abs(curr - options.width) < Math.abs(prev - options.width) ? curr : prev;
			});

			// Save the width the user asked for to inform the `width` and `height` on the `img` tag
			options.inputtedWidth = options.width;
			options.width = nearestWidth;
		}
	}

	if (options.quality && typeof options.quality === 'string') {
		options.quality = options.quality in qualityTable ? qualityTable[options.quality] : undefined;
	}

	if (!options.quality) {
		options.quality = 100;
	}

	return options;
}
