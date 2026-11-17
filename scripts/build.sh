#!/bin/sh
# Copy only the public website files into _site (used by Netlify; see netlify.toml).
set -e
rm -rf _site
mkdir _site
tar -cf - \
  --exclude='./_site' --exclude='./.git' --exclude='./.github' --exclude='./.netlify' --exclude='./.claude' \
  --exclude='./print-assets' --exclude='./scripts' --exclude='./node_modules' \
  --exclude='*.md' --exclude='./netlify.toml' --exclude='./.gitignore' --exclude='.DS_Store' \
  . | tar -xf - -C _site
# Safety check: stop the deploy if a private file slipped through.
if find _site -name '*.md' -o -path '_site/print-assets*' | grep -q .; then
  echo "Build stopped: private notes or print files found in _site" >&2
  exit 1
fi
echo "Built _site with $(find _site -type f | wc -l | tr -d ' ') files"
