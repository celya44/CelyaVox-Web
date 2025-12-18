#!/bin/bash

# Script de création du package Teams pour CelyaVox
# Usage: ./create-teams-package.sh

set -e

echo "🚀 Création du package Teams pour CelyaVox"
echo "==========================================="

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "manifest-teams.json" ]; then
    echo "❌ Erreur: manifest-teams.json introuvable"
    echo "   Exécutez ce script depuis le répertoire Phone/"
    exit 1
fi

# Créer le répertoire temporaire
echo "📁 Création du répertoire temporaire..."
rm -rf teams-package
mkdir -p teams-package/icons

# Copier et renommer le manifeste
echo "📋 Copie du manifeste..."
cp manifest-teams.json teams-package/manifest.json

# Vérifier les icônes
if [ ! -f "icons/color-192.png" ]; then
    echo "⚠️  Attention: icons/color-192.png introuvable"
    echo "   Créez cette icône (192x192px minimum) pour l'icône couleur"
fi

if [ ! -f "icons/outline-32.png" ]; then
    echo "⚠️  Attention: icons/outline-32.png introuvable"
    echo "   Créez cette icône (32x32px, outline) pour l'icône Teams"
fi

# Copier les icônes si elles existent
if [ -f "icons/color-192.png" ]; then
    echo "🎨 Copie de l'icône couleur..."
    cp icons/color-192.png teams-package/icons/color-192.png
fi

if [ -f "icons/outline-32.png" ]; then
    echo "🎨 Copie de l'icône outline..."
    cp icons/outline-32.png teams-package/icons/outline-32.png
fi

# Vérifier que le manifeste est valide
echo "✅ Validation du manifeste..."
if ! python3 -m json.tool teams-package/manifest.json > /dev/null 2>&1; then
    echo "❌ Erreur: Le manifeste JSON n'est pas valide"
    exit 1
fi

# Vérifier les champs requis
echo "🔍 Vérification des champs requis..."
GUID=$(grep -o '"id": "[^"]*"' teams-package/manifest.json | cut -d'"' -f4)
if [ "$GUID" = "YOUR-APP-ID-GUID" ]; then
    echo "⚠️  Attention: Vous devez générer un GUID unique pour votre application"
    echo "   Utilisez: uuidgen"
    echo "   Puis modifiez manifest-teams.json"
    read -p "   Voulez-vous continuer quand même? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        exit 1
    fi
fi

DOMAIN=$(grep -o '"websiteUrl": "[^"]*"' teams-package/manifest.json | cut -d'"' -f4)
if [[ $DOMAIN == *"VOTRE-DOMAINE"* ]]; then
    echo "⚠️  Attention: Vous devez remplacer VOTRE-DOMAINE.com par votre domaine réel"
    read -p "   Voulez-vous continuer quand même? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        exit 1
    fi
fi

# Créer le package ZIP
echo "📦 Création du package ZIP..."
cd teams-package
zip -r ../celyavox-teams.zip * > /dev/null
cd ..

# Vérifier la taille du package
SIZE=$(du -h celyavox-teams.zip | cut -f1)
echo "✅ Package créé avec succès: celyavox-teams.zip ($SIZE)"

# Instructions finales
echo ""
echo "🎉 Package Teams créé!"
echo "======================"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez que le manifeste contient votre GUID et domaine"
echo "   2. Téléchargez celyavox-teams.zip dans le Centre d'administration Teams"
echo "   3. Consultez README-TEAMS.md pour les instructions détaillées"
echo ""
echo "🔗 Ressources utiles:"
echo "   - Centre admin Teams: https://admin.teams.microsoft.com"
echo "   - Documentation: README-TEAMS.md"
echo ""

# Nettoyer
read -p "Voulez-vous supprimer le répertoire temporaire? (O/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    rm -rf teams-package
    echo "✨ Répertoire temporaire supprimé"
fi

echo "✅ Terminé!"
