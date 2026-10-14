// The contact form endpoint, rendered on demand by the Worker. The logic is in src/lib/contact.mjs.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleContact } from '../../lib/contact.mjs';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContact(request, env);

export const ALL: APIRoute = ({ request }) => handleContact(request, env);
