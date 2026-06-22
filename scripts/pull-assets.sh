#!/usr/bin/env bash
# Pull all brand image assets referenced by carmel-kinnertSite.html into assets/brand/.
# Strips the Wix /v1/fill/... transform suffix to fetch originals where possible.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/brand"
mkdir -p "$OUT_DIR"

# base url => output filename
declare -a ASSETS=(
  "https://static.wixstatic.com/media/8a229a_bc0ebb3623a94f1ea65c87df70bd2c4c~mv2.png|trail-logo.png"
  "https://static.wixstatic.com/media/8a229a_c011432136f34ebf90bf08d92771a245~mv2.jpg|brand-1.jpg"
  "https://static.wixstatic.com/media/8a229a_56c3570e4b794a3da1734a4cd80addc7~mv2.jpg|whatsapp-photo.jpg"
  "https://static.wixstatic.com/media/8a229a_7de476ee49c04655847a1dd4f5913771~mv2.jpg|kinneret-karmel.jpg"
  "https://static.wixstatic.com/media/8a229a_ab68b1451b5a4f418e856f064477ce65~mv2.png|brand-2.png"
  "https://static.wixstatic.com/media/8a229a_b4df70cbfd924e808e03b7f96cf12971~mv2.png|google-maps-icon.png"
)

: > "$OUT_DIR/SOURCES.md"
echo "# Brand asset sources (pulled from carmel-kinnertSite.html / static.wixstatic.com)" >> "$OUT_DIR/SOURCES.md"
echo "" >> "$OUT_DIR/SOURCES.md"

for entry in "${ASSETS[@]}"; do
  url="${entry%%|*}"
  name="${entry##*|}"
  echo "Downloading $name <- $url"
  curl -fsSL "$url" -o "$OUT_DIR/$name" || echo "WARN: failed $url"
  echo "- \`$name\` ← $url" >> "$OUT_DIR/SOURCES.md"
done

echo "Done. Assets in $OUT_DIR"
ls -la "$OUT_DIR"
