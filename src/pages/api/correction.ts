// The "Suggest a correction" endpoint, rendered on demand by the Worker. The logic is in src/lib/correction.mjs.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleCorrection } from '../../lib/correction.mjs';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleCorrection(request, env);

export const ALL: APIRoute = ({ request }) => handleCorrection(request, env);
