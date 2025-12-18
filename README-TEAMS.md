# Intégration CelyaVox avec Microsoft Teams

Ce guide explique comment intégrer votre application CelyaVox en tant qu'application Teams, tout en conservant la possibilité d'y accéder directement via navigateur.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration initiale](#configuration-initiale)
3. [Création de l'application Teams](#création-de-lapplication-teams)
4. [Déploiement](#déploiement)
5. [Utilisation](#utilisation)
6. [Dépannage](#dépannage)

---

## 🔧 Prérequis

### Configuration serveur requise

- **HTTPS obligatoire** : Votre application doit être accessible via HTTPS
- **Domaine public** : Un nom de domaine accessible depuis Internet
- **En-têtes CORS** : Configurés pour autoriser Teams
- **Content Security Policy** : Doit autoriser `https://*.teams.microsoft.com`

### Compte Microsoft requis

- Un compte Microsoft 365 avec accès au Centre d'administration Teams
- Droits d'administrateur pour installer des applications Teams personnalisées

---

## ⚙️ Configuration initiale

### 1. Configurer votre serveur web

Ajoutez les en-têtes HTTP suivants à votre configuration serveur :

#### Apache (.htaccess ou configuration du VirtualHost)

```apache
# En-têtes de sécurité pour Teams
Header always set Content-Security-Policy "frame-ancestors https://*.teams.microsoft.com https://*.microsoft.com"
Header always set X-Frame-Options "ALLOW-FROM https://teams.microsoft.com"

# CORS pour Teams
Header always set Access-Control-Allow-Origin "https://teams.microsoft.com"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

#### Nginx

```nginx
# Dans votre bloc location
add_header Content-Security-Policy "frame-ancestors https://*.teams.microsoft.com https://*.microsoft.com" always;
add_header X-Frame-Options "ALLOW-FROM https://teams.microsoft.com" always;
add_header Access-Control-Allow-Origin "https://teams.microsoft.com" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

### 2. Vérifier l'accessibilité

Testez que votre application est accessible :

```bash
curl -I https://votre-domaine.com/electronapp/app/Phone/index.html
```

Vérifiez que vous obtenez un code 200 et que les en-têtes sont présents.

---

## 🎨 Création de l'application Teams

### 1. Préparer les icônes

Créez deux versions de votre logo :

- **Icon couleur** : `icons/color-192.png` (192x192 pixels)
- **Icon outline** : `icons/outline-32.png` (32x32 pixels, transparent, monochrome)

### 2. Modifier le manifeste Teams

Éditez le fichier `manifest-teams.json` :

```json
{
  "id": "GÉNÉREZ-UN-GUID-UNIQUE",
  "packageName": "com.votreentreprise.celyavox",
  "developer": {
    "name": "Votre Entreprise",
    "websiteUrl": "https://votre-domaine.com",
    "privacyUrl": "https://votre-domaine.com/privacy",
    "termsOfUseUrl": "https://votre-domaine.com/terms"
  },
  "validDomains": [
    "votre-domaine.com"
  ]
}
```

**Génération d'un GUID** :

```bash
# Linux/Mac
uuidgen

# Ou en ligne
# https://www.uuidgenerator.net/
```

### 3. Mettre à jour les URLs

Dans `manifest-teams.json`, remplacez toutes les occurrences de `VOTRE-DOMAINE.com` par votre domaine réel :

```json
"configurationUrl": "https://votre-domaine.com/electronapp/app/Phone/teams-config.html",
"contentUrl": "https://votre-domaine.com/electronapp/app/Phone/index.html"
```

### 4. Créer le package Teams

Créez un fichier ZIP contenant :

```
celyavox-teams.zip
├── manifest-teams.json (renommé en manifest.json)
├── icons/
│   ├── color-192.png
│   └── outline-32.png
```

**Commandes** :

```bash
cd /opt/freepbx/www/electronapp/app/Phone
mkdir -p teams-package/icons

# Copier et renommer le manifeste
cp manifest-teams.json teams-package/manifest.json

# Copier les icônes (ajustez les chemins selon vos fichiers)
cp icons/color-192.png teams-package/icons/color-192.png
cp icons/outline-32.png teams-package/icons/outline-32.png

# Créer le package
cd teams-package
zip -r ../celyavox-teams.zip *
cd ..
```

---

## 🚀 Déploiement

### Option 1 : Installation pour votre organisation (Recommandé)

1. **Accéder au Centre d'administration Teams**
   - Connectez-vous à [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com)

2. **Télécharger l'application**
   - Allez dans **Teams apps** → **Manage apps**
   - Cliquez sur **Upload** → **Upload an app**
   - Sélectionnez le fichier `celyavox-teams.zip`

3. **Définir les autorisations**
   - Allez dans **Setup policies**
   - Ajoutez l'application aux utilisateurs ou groupes autorisés

4. **Publier l'application**
   - Retournez dans **Manage apps**
   - Trouvez "CelyaVox Phone"
   - Cliquez sur **Publish**

### Option 2 : Installation personnelle (Développement/Test)

1. **Activer le chargement latéral (sideloading)**
   - Centre d'administration Teams → **Teams apps** → **Setup policies**
   - Activez **Upload custom apps**

2. **Installer depuis Teams**
   - Ouvrez Microsoft Teams
   - Cliquez sur **Apps** dans la barre latérale
   - En bas, cliquez sur **Manage your apps**
   - Cliquez sur **Upload an app** → **Upload a custom app**
   - Sélectionnez `celyavox-teams.zip`

---

## 💡 Utilisation

### Dans Microsoft Teams

1. **Ajouter l'application**
   - Recherchez "CelyaVox" dans le store d'applications Teams
   - Cliquez sur **Add**

2. **Configuration initiale**
   - Lors du premier lancement, vous verrez la page de configuration
   - Renseignez :
     - Nom d'affichage
     - Serveur WebSocket (ex: pbx.exemple.com)
     - Port WebSocket (ex: 8089)
     - Domaine SIP
   - Cliquez sur **Save**

3. **Utilisation**
   - L'application apparaît dans votre barre latérale Teams
   - Cliquez dessus pour l'ouvrir
   - L'application conserve vos paramètres

### Accès direct (navigateur)

Votre application reste accessible directement via :

```
https://votre-domaine.com/electronapp/app/Phone/index.html
```

L'application détecte automatiquement si elle est dans Teams ou dans un navigateur normal et s'adapte en conséquence.

---

## 🔍 Dépannage

### L'application ne se charge pas dans Teams

**Vérifications :**

1. **Tester l'URL directement**
   ```bash
   curl -I https://votre-domaine.com/electronapp/app/Phone/index.html
   ```

2. **Vérifier les en-têtes**
   - Utilisez les outils de développement de votre navigateur
   - Onglet Network → Headers
   - Vérifiez `Content-Security-Policy` et `X-Frame-Options`

3. **Vérifier le manifeste**
   ```bash
   # Valider le JSON
   cat manifest-teams.json | python3 -m json.tool
   ```

### Erreur "App validation failed"

- Vérifiez que toutes les URLs dans le manifeste sont en HTTPS
- Vérifiez que les icônes existent et ont les bonnes dimensions
- Vérifiez que le GUID est unique et valide

### La configuration ne se sauvegarde pas

- Ouvrez la console du navigateur (F12)
- Vérifiez les erreurs JavaScript
- Vérifiez que le localStorage est accessible

### L'application ne détecte pas Teams

- Vérifiez que le SDK Teams est chargé :
  ```javascript
  // Dans la console du navigateur
  console.log(typeof microsoftTeams);
  // Devrait afficher "object"
  ```

### Problèmes de thème

- Le thème Teams est appliqué automatiquement
- Vérifiez dans la console :
  ```javascript
  console.log(teamsContext);
  ```

---

## 📝 Notes importantes

### Sécurité

- **Ne jamais** stocker les mots de passe SIP dans le manifeste
- Les utilisateurs doivent configurer leurs identifiants individuellement
- Utilisez HTTPS partout

### Performance

- L'application est chargée dans un iframe dans Teams
- Les performances peuvent être légèrement réduites
- Testez avec des appels réels pour valider

### Mises à jour

Pour mettre à jour l'application :

1. Modifiez le numéro de version dans `manifest-teams.json`
2. Recréez le package ZIP
3. Téléchargez la nouvelle version dans le Centre d'administration Teams

### Limites

- Maximum 20 Mo pour le package complet
- Les fenêtres popup peuvent être bloquées dans Teams
- Certaines API navigateur peuvent être limitées

---

## 🆘 Support

### Ressources Microsoft Teams

- [Documentation officielle Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [Teams App Validator](https://dev.teams.microsoft.com/appvalidation.html)
- [Forum développeurs Teams](https://docs.microsoft.com/en-us/answers/topics/office-teams-app-dev.html)

### Logs et débogage

Pour activer les logs détaillés dans Teams :

1. Ouvrez Teams
2. Allez dans **Settings** → **General**
3. Activez **Developer mode**
4. Les logs apparaîtront dans la console (F12)

### Tester en local

Pour tester avant le déploiement :

1. Utilisez ngrok ou un tunnel similaire :
   ```bash
   ngrok http 443
   ```

2. Utilisez l'URL ngrok dans votre manifeste
3. Testez avec le package de test

---

## ✅ Checklist de déploiement

Avant de déployer en production :

- [ ] HTTPS configuré et fonctionnel
- [ ] En-têtes CORS et CSP configurés
- [ ] Icônes créées et aux bonnes dimensions
- [ ] GUID unique généré dans le manifeste
- [ ] Toutes les URLs mises à jour avec votre domaine
- [ ] Package ZIP créé et validé
- [ ] Test en environnement de développement Teams réussi
- [ ] Configuration testée et fonctionnelle
- [ ] Appels audio/vidéo testés depuis Teams
- [ ] Documentation utilisateur préparée

---

## 📄 Licence

Ce module d'intégration Teams est fourni sous la même licence que CelyaVox.

---

**Bon déploiement ! 🚀**
