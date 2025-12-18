# Système de Notifications pour Navigateur Web

## 📋 Vue d'ensemble

Ce système permet d'afficher des **notifications système natives** lorsque l'application CelyaVox est utilisée dans un **navigateur web**. Les notifications apparaissent uniquement quand la fenêtre n'a pas le focus.

## ✨ Nouveautés version 2.0

- ✅ **Page de test interactive** : `notification-call-browser.html`
- 📞 **Notifications enrichies** avec emojis et icônes
- 💬 **Aperçu des messages** (250 caractères)
- 🔔 **Notifications persistantes** pour les appels
- 🎯 **Meilleure gestion** des permissions refusées
- 📊 **Logs détaillés** pour le débogage

## 🚀 Fichiers

### 1. `notification-call-browser.html` (NOUVEAU)
Page de test complète avec :
- Interface visuelle pour tester les notifications
- Gestion interactive des permissions
- Console de logs en temps réel
- Instructions d'utilisation

### 2. `phone.js` (MODIFIÉ)
Fonctions principales :
- `isRunningInBrowser()` : Détection d'environnement
- `requestBrowserNotificationPermission()` : Demande permission
- `showBrowserNotification()` : Affichage notification enrichie

## 🎯 Utilisation

### Test rapide
1. Ouvrir `notification-call-browser.html`
2. Cliquer "Demander la Permission"
3. Autoriser les notifications
4. **MINIMISER la fenêtre**
5. Cliquer "Tester Notification d'Appel"

### Intégration
Les notifications sont automatiquement affichées pour :
- 📞 Appels entrants (persistants)
- 💬 Messages (auto-fermeture après 10s)

## 🔐 Permissions

Si "denied", suivre ces étapes :
1. Cliquer sur 🔒 dans la barre d'adresse
2. Autoriser "Notifications"
3. Recharger (F5)

## 📚 Documentation complète

Voir le fichier complet pour :
- Architecture détaillée
- Options de personnalisation
- Compatibilité navigateurs
- Guide de dépannage
- API complète

---
Version 2.0 - Décembre 2025
