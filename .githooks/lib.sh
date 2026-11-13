# Shared by the hooks (sourced, not run; reused from canopi-climate's .githooks/lib.sh).
#
# capped <cmd…>: runs a command in a systemd scope capped at 3 GB of memory with no swap, and at
#   10 minutes, when systemd-run works; plainly otherwise (CI, macOS). On the maintainer's machine one
#   out-of-memory kill stops the whole terminal session.
# step <label> <cmd…>: runs `capped <cmd…>`, prints the label and its time, and returns its status.
# tier_done <tier> <start> <budget seconds>: prints the tier's time; warns above its budget and fails
#   (returns 1) above 1.5× it (E3 exit: "every tier prints its time, warn above its ratchet, fail only
#   above 1.5×"). A tier over 1.5× moves its slowest step to CI (design check R6), it is not raised.
# zero_markers: node scripts/expect-fail.mjs --zero, held to .githooks/zero-markers: with `fail` a
#   marker left fails; with `warn` it prints the count (a GitHub warning annotation in CI) and passes.
# docs_only: reads paths on stdin, one per line; true when there is at least one and every one is
#   documentation (knowledge/**, .beads/**, docs/**, a root *.md; never src/data/*.md, which is site
#   content). The same rule as the `changes` job of .github/workflows/ci.yml (design check A20).
capped() {
  if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --scope -q true >/dev/null 2>&1; then
    timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 "$@"
  else
    "$@"
  fi
}

step() {
  label=$1
  shift
  t0=$(date +%s)
  capped "$@"
  status=$?
  echo "  $label: $(($(date +%s) - t0)) s$([ "$status" -eq 0 ] || echo ", FAILED (exit $status)")" >&2
  return "$status"
}

tier_done() {
  elapsed=$(($(date +%s) - $2))
  if [ $((elapsed * 2)) -gt $(($3 * 3)) ]; then
    echo "$1: $elapsed s, more than 1.5x its budget of $3 s. Rerun on a quiet machine; if it stays slow, move the slowest step above to CI." >&2
    return 1
  fi
  if [ "$elapsed" -gt "$3" ]; then
    echo "$1: $elapsed s (WARNING: above its budget of $3 s)" >&2
  else
    echo "$1: $elapsed s (budget $3 s)" >&2
  fi
  return 0
}

DOCS_ONLY_RE='^(knowledge/|\.beads/|docs/|[^/]+\.md$)'
docs_only() {
  seen=no
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    seen=yes
    printf '%s\n' "$path" | grep -qE "$DOCS_ONLY_RE" || return 1
  done
  [ "$seen" = yes ]
}

need_node_modules() {
  [ -x node_modules/.bin/astro ] && return 0
  echo "$1: node_modules is missing; run npm ci (capped) first, or push with --no-verify." >&2
  return 1
}

zero_markers() {
  mode=$(grep -v '^#' .githooks/zero-markers 2>/dev/null | tr -d '[:space:]')
  out=$(capped node scripts/expect-fail.mjs --zero 2>&1) && { printf '%s\n' "$out" | tail -n 1; return 0; }
  printf '%s\n' "$out"
  [ "$mode" = warn ] || return 1
  count=$(printf '%s\n' "$out" | sed -n 's/^\([0-9][0-9]*\) expected-fail marker(s)$/\1/p')
  msg="$count expected-fail marker(s) left; not failing until the batch exit flips .githooks/zero-markers to fail"
  if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::warning::$msg"; else echo "$msg" >&2; fi
  return 0
}
