// /version.json, the version marker (E3, design check A15): which commit the live site was built from.
// Cloudflare deployments carry no commit id, so CI's `live` job polls this file for the commit that
// moved the `deploy` branch, and the rollback probe reads it. Served with Cache-Control: no-store
// (public/_headers).
//
// Prerendered at build time, in workerd (the Cloudflare adapter's default), so there is no shell, no
// file system and no process.env here. The values are inlined by the build:
// - sha: WORKERS_CI_COMMIT_SHA (Workers Builds), else GITHUB_SHA (GitHub Actions), else the
//   checkout's .git/HEAD: a detached sha, or the loose ref of master or deploy only (read with
//   import.meta.glob, so nothing else of .git reaches the build); else null (a worktree, a packed
//   ref, a tarball: the build still works).
// - built_at: the build time, ISO 8601 UTC.
// - node: the Node version npm reports (npm_config_user_agent, "… node/v22.x.y …") when the build
//   runs through npm, else null. It shows whether Workers Builds builds on .node-version's Node.
// Nothing else: a commit id of a public repository, a time and a version number. Anything that is
// not a full lowercase hex sha or a plain version becomes null, so no other text can leak through.
import type { APIRoute } from 'astro';

export const prerender = true;

const SHA = /^[0-9a-f]{40}$/;
const asSha = (value: unknown): string | null => {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SHA.test(s) ? s : null;
};

// The checkout's HEAD and the two loose branch refs the site deploys from, as raw text (empty when
// absent: a worktree's .git is a file, and a packed ref has no loose file).
const gitFiles = import.meta.glob<string>(['/.git/HEAD', '/.git/refs/heads/master', '/.git/refs/heads/deploy'], {
  query: '?raw',
  import: 'default',
  eager: true,
  exhaustive: true,
});

function gitSha(files: Record<string, string>): string | null {
  const head = (files['/.git/HEAD'] ?? '').trim();
  const direct = asSha(head);
  if (direct) return direct;
  const ref = head.match(/^ref: (refs\/heads\/(?:master|deploy))$/)?.[1];
  return ref ? asSha(files[`/.git/${ref}`]) : null;
}

function nodeVersion(userAgent: unknown): string | null {
  const m = typeof userAgent === 'string' ? userAgent.match(/(?:^|\s)node\/(v\d+\.\d+\.\d+)(?:\s|$)/) : null;
  return m ? m[1] : null;
}

function versionMarker(env: { workers?: unknown; github?: unknown; userAgent?: unknown }, files: Record<string, string>, now: Date) {
  return {
    sha: asSha(env.workers) ?? asSha(env.github) ?? gitSha(files),
    built_at: now.toISOString(),
    node: nodeVersion(env.userAgent),
  };
}

export const GET: APIRoute = () => {
  const marker = versionMarker(
    { workers: import.meta.env.WORKERS_CI_COMMIT_SHA, github: import.meta.env.GITHUB_SHA, userAgent: import.meta.env.npm_config_user_agent },
    gitFiles,
    new Date(),
  );
  return new Response(`${JSON.stringify(marker)}\n`, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
