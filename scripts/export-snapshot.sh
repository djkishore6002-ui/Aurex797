#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Solai — static GitHub Pages snapshot
#
# Builds `out/`: a fully static mirror of Solai's PUBLIC pages (home,
# culture explorer, 3D heritage temple, TN map, resources, courses, lessons,
# workshops, vocabulary…) with all content baked in from the live database.
# Server-only routes (APIs, auth, admin, dashboards) are temporarily moved
# out for the export build and restored afterwards — the live app is
# untouched. Publishing to GitHub Pages is a separate step (temp clone →
# gh-pages branch), so this script can never disturb the working tree.
#
#   ./scripts/export-snapshot.sh     → builds out/
#
# The static mirror cannot run the Node API (GitHub Pages is pure static),
# so sign-in / AI tutor / quiz saving are disabled there by design; the full
# app keeps running from the live preview or a local `npm run dev`.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f data/solai.db ]; then
  echo "✗ data/solai.db not found — start the app once (npm run dev) to seed it, then re-run." >&2
  exit 1
fi

STASH=".static-stash"
export SOLAI_STATIC=1

# Routes that require the Node server (APIs, auth, dashboards) are not part of
# the static mirror — move them out of src/app while the export build runs.
EXCLUDED=(api admin organizer ask dashboard profile practice quiz verify notifications community login register forgot)

cleanup() {
  if [ -d "$STASH" ]; then
    for d in "${EXCLUDED[@]}"; do
      [ -d "$STASH/$d" ] && mv "$STASH/$d" "src/app/$d"
    done
    rm -rf "$STASH"
  fi
}
trap cleanup EXIT

rm -rf "$STASH"
mkdir -p "$STASH"
for d in "${EXCLUDED[@]}"; do
  if [ -d "src/app/$d" ]; then
    mv "src/app/$d" "$STASH/$d"
  fi
done
echo "→ trimmed server-only routes: ${EXCLUDED[*]}"

echo "→ building static export (SOLAI_STATIC=1)…"
npm run build

echo "✓ static snapshot written to out/"
