import type { AstroIntegration } from 'astro';

type ImageFormat = 'image/avif' | 'image/webp';
type RemotePattern = {
	protocol?: 'http' | 'https';
	hostname: string;
	port?: string;
	pathname?: string;
};

export type VercelImageConfig = {
	/**
	 * Supported image widths.
	 */
	sizes: number[];
	/**
	 * Allowed external domains that can use Image Optimization. Leave empty for only allowing the deployment domain to use Image Optimization.
	 */
	domains: string[];
	/**
	 * Allowed external patterns that can use Image Optimization. Similar to `domains` but provides more control with RegExp.
	 */
	remotePatterns?: RemotePattern[];
	/**
	 * Cache duration (in seconds) for the optimized images.
	 */
	minimumCacheTTL?: number;
	/**
	 * Supported output image formats
	 */
	formats?: ImageFormat[];
	/**
	 * Allow SVG input image URLs. This is disabled by default for security purposes.
	 */
	dangerouslyAllowSVG?: boolean;
	/**
	 * Change the [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) of the optimized images.
	 */
	contentSecurityPolicy?: string;
};

export interface VercelEdgeConfig {
	includeFiles?: string[];
	analytics?: boolean;
	imageService?: boolean;
	imagesConfig?: VercelImageConfig;
}

export default function vercelEdge({ includeFiles, analytics, imageService, imagesConfig, }?: VercelEdgeConfig): AstroIntegration;
