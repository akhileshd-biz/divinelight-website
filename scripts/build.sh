#!/bin/sh
# Copy only the public website files into _site (used by Netlify; see netlify.toml),
# then fetch the library audio from Google Drive.
set -e
rm -rf _site
mkdir _site
tar -cf - \
  --exclude='./_site' --exclude='./.git' --exclude='./.github' --exclude='./.netlify' --exclude='./.claude' \
  --exclude='./print-assets' --exclude='./scripts' --exclude='./node_modules' \
  --exclude='*.md' --exclude='./netlify.toml' --exclude='./.gitignore' --exclude='.DS_Store' \
  . | tar -xf - -C _site

# Library audio: skip files already present (local builds), otherwise download.
mkdir -p _site/media
grep -v '^#' scripts/audio-sources.txt | while read -r name id; do
  [ -n "$name" ] || continue
  out="_site/media/$name"
  [ -s "$out" ] && continue
  for try in 1 2 3; do
    curl -sSfL --retry 2 -o "$out" "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t" || true
    # A real MP3 is large and starts with "ID3" (or an MPEG frame), not an HTML page.
    if [ "$(wc -c < "$out" 2>/dev/null || echo 0)" -gt 1000000 ] && head -c 3 "$out" | grep -q 'ID3\|^\xff'; then
      echo "Audio ready: $name"; break
    fi
    rm -f "$out"; sleep 3
  done
  [ -s "$out" ] || echo "WARNING: could not download $name; its lesson page will say 'not available yet'." >&2
done

# Safety check: stop the deploy if a private file slipped through.
if find _site -name '*.md' -o -path '_site/print-assets*' | grep -q .; then
  echo "Build stopped: private notes or print files found in _site" >&2
  exit 1
fi
echo "Built _site with $(find _site -type f | wc -l | tr -d ' ') files"
