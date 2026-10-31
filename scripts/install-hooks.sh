#!/bin/sh
# Installiert die Git-Hooks des Projekts nach .git/hooks (ändert keine Git-Konfiguration).
set -e
root=$(git rev-parse --show-toplevel)
mkdir -p "$root/.git/hooks"
cp "$root/scripts/git-hooks/pre-commit" "$root/.git/hooks/pre-commit"
chmod +x "$root/.git/hooks/pre-commit"
echo "pre-commit-Hook installiert."
