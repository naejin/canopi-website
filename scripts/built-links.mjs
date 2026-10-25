// How check-built-site resolves an internal link (a path, no host) to a file in the build:
// /a/b/ → a/b/index.html, /a.txt → a.txt. A path that is neither (no trailing slash, no file
// extension) is an error even when the folder exists: the host would answer it with a redirect,
// so the link should name the final URL.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function builtTarget(root, pathname) {
  const path = decodeURIComponent(pathname);
  const isPage = path.endsWith('/');
  const isFile = /\/[^/]+\.[a-z0-9]+$/i.test(path);
  if (!isPage && !isFile) return { error: `link to ${pathname} lacks its trailing slash (use ${pathname}/)` };
  const file = join(root, path, isPage ? 'index.html' : '');
  return existsSync(file) && statSync(file).isFile() ? { file } : { error: `link to ${pathname} has no built page` };
}

// The folder names in dir, skipping stray files (.DS_Store, a README): each guide is a folder.
export function subdirectories(dir) {
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
