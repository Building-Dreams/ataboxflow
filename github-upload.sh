#!/usr/bin/env bash

set -e

echo "Vul hieronder je GitHub repository URL in."
echo "Voorbeeld: https://github.com/jouw-gebruikersnaam/jouw-repository.git"
read -r -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "Geen repository URL ingevuld. Script gestopt."
  exit 1
fi

if [ ! -d ".git" ]; then
  git init
fi

git add .
git commit -m "Initial FTTH workorder app" || echo "Geen nieuwe wijzigingen om te committen."
git branch -M main

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git push -u origin main

echo "Klaar. Project is naar GitHub geupload."

