import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

const APP_PREFIX = "/app";
const APP_ENTRY = "/app/";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (response.status !== 404) return response;
  if (context.request.method !== "GET" && context.request.method !== "HEAD") return response;

  const { pathname } = new URL(context.request.url);
  if (pathname !== APP_PREFIX && !pathname.startsWith(`${APP_PREFIX}/`)) return response;

  const accept = context.request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return response;

  const request = new Request(new URL(APP_ENTRY, context.request.url), context.request);
  return env.ASSETS.fetch(request);
});
