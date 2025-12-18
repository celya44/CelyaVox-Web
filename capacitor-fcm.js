/**
 * Capacitor FCM Management Module
 * Gestion des tokens Firebase Cloud Messaging pour l'application Capacitor
 * 
 * Ce module fournit des fonctions réutilisables pour :
 * - Initialiser les notifications push FCM
 * - Envoyer les tokens à l'API backend
 * - Gérer les retries en cas d'échec
 * - Stocker et comparer les tokens
 */

// Configuration
const FCM_CONFIG = {
    MAX_RETRY_ATTEMPTS: 5,
    RETRY_DELAYS: [0, 2000, 5000, 10000, 30000, 60000], // en millisecondes
    STORAGE_KEYS: {
        LAST_TOKEN: 'last_fcm_token',
        FAILED_TOKEN: 'fcm_token_failed',
        SENT_AT: 'fcm_token_sent_at',
        RETRY_COUNT: 'fcm_retry_count'
    }
};

/**
 * Récupère la configuration SIP depuis localStorage
 * @returns {Object} Configuration avec domain, extension, apiKey
 */
function getSipConfiguration() {
    return {
        domain: localStorage.getItem('SipDomain') || localStorage.getItem('SipDomaine'),
        extension: localStorage.getItem('SipUsername') || localStorage.getItem('SipUserID') || localStorage.getItem('profileUserID'),
        apiKey: localStorage.getItem('api_key') || localStorage.getItem('ApiKey') || localStorage.getItem('API_KEY')
    };
}

/**
 * Valide le format d'un token FCM
 * @param {string} token - Token à valider
 * @returns {boolean} true si le token est valide
 */
function isValidFCMToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    const trimmed = token.trim();
    // Un token FCM fait généralement entre 100 et 200 caractères
    return trimmed.length > 50 && trimmed.length < 500;
}

/**
 * Envoie le token FCM à l'API backend
 * @param {string} token - Token FCM à envoyer
 * @returns {Promise<boolean>} true si l'envoi a réussi
 */
async function sendFCMTokenToAPI(token) {
    if (!isValidFCMToken(token)) {
        console.warn('[FCM] Token invalide, envoi annulé');
        return false;
    }
    
    try {
        console.log('[FCM] Préparation envoi token à l\'API...');
        
        const config = getSipConfiguration();
        
        // Vérifier la configuration minimale
        if (!config.domain) {
            console.warn('[FCM] Configuration SIP incomplète (domaine manquant)');
            localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN, token);
            return false;
        }
        
        if (!config.extension) {
            console.warn('[FCM] Configuration SIP incomplète (extension manquante)');
            localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN, token);
            return false;
        }
        
        // Construire l'URL (SANS retirer le préfixe 99 de l'extension)
        let baseUrl = config.domain;
        if (!/^https?:\/\//i.test(baseUrl)) {
            baseUrl = 'https://' + baseUrl;
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        
        const url = new URL(baseUrl + '/celyavox-api/fcm/settoken');
        url.searchParams.set('extension', config.extension);
        url.searchParams.set('token_fcm', token);
        
        if (config.apiKey) {
            url.searchParams.set('api_key', config.apiKey);
        }
        
        console.log('[FCM] Envoi du token pour extension:', config.extension);
        
        const response = await fetch(url.toString(), { 
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ' - ' + response.statusText);
        }
        
        const result = await response.text();
        console.log('[FCM] ✅ Token envoyé avec succès:', result);
        
        // Stocker le token et le timestamp
        localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.LAST_TOKEN, token);
        localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.SENT_AT, Date.now().toString());
        localStorage.removeItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN);
        localStorage.removeItem(FCM_CONFIG.STORAGE_KEYS.RETRY_COUNT);
        
        return true;
        
    } catch (error) {
        console.error('[FCM] ❌ Erreur lors de l\'envoi du token:', error.message);
        return false;
    }
}

/**
 * Réessaye d'envoyer le token avec un backoff exponentiel
 * @param {string} token - Token à envoyer
 * @param {number} attempt - Numéro de la tentative actuelle
 * @param {number} maxAttempts - Nombre maximum de tentatives
 */
function retryFCMTokenSend(token, attempt = 1, maxAttempts = FCM_CONFIG.MAX_RETRY_ATTEMPTS) {
    if (!isValidFCMToken(token)) {
        console.error('[FCM] Token invalide, retry annulé');
        return;
    }
    
    const delay = FCM_CONFIG.RETRY_DELAYS[Math.min(attempt, FCM_CONFIG.RETRY_DELAYS.length - 1)];
    
    console.log('[FCM] Retry #' + attempt + '/' + maxAttempts + ' dans ' + (delay / 1000) + 's...');
    
    localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.RETRY_COUNT, attempt.toString());
    
    setTimeout(async () => {
        const success = await sendFCMTokenToAPI(token);
        
        if (!success && attempt < maxAttempts) {
            // Continuer les retries
            retryFCMTokenSend(token, attempt + 1, maxAttempts);
        } else if (!success) {
            console.error('[FCM] ❌ Échec définitif après ' + maxAttempts + ' tentatives');
            localStorage.setItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN, token);
        } else {
            console.log('[FCM] ✅ Token envoyé avec succès après ' + attempt + ' tentative(s)');
        }
    }, delay);
}

/**
 * Vérifie et renvoie un token ayant échoué précédemment
 * @returns {Promise<void>}
 */
async function checkAndResendFailedToken() {
    try {
        const failedToken = localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN);
        
        if (!failedToken) {
            return; // Pas de token en échec
        }
        
        const config = getSipConfiguration();
        
        if (!config.domain || !config.extension) {
            console.log('[FCM] Configuration SIP toujours incomplète, retry différé');
            return;
        }
        
        console.log('[FCM] Tentative de renvoi du token en échec...');
        const success = await sendFCMTokenToAPI(failedToken);
        
        if (!success) {
            retryFCMTokenSend(failedToken, 1);
        }
    } catch (error) {
        console.error('[FCM] Erreur lors du resend:', error);
    }
}

/**
 * Initialise le système FCM pour Capacitor
 * @param {boolean} isCapacitor - Indique si l'app tourne dans Capacitor
 * @returns {Promise<void>}
 */
async function initializeCapacitorFCM(isCapacitor = false) {
    if (!isCapacitor) {
        console.log('[FCM] Non-Capacitor, initialisation FCM ignorée');
        return;
    }
    
    try {
        console.log('[FCM] Initialisation du système FCM...');
        
        // Vérifier que Capacitor et le plugin sont disponibles
        if (typeof Capacitor === 'undefined') {
            console.warn('[FCM] Capacitor non disponible');
            return;
        }
        
        if (!Capacitor.Plugins || !Capacitor.Plugins.PushNotifications) {
            console.warn('[FCM] Plugin PushNotifications non disponible');
            return;
        }
        
        const PushNotifications = Capacitor.Plugins.PushNotifications;
        
        // Listener pour la réception du token
        await PushNotifications.addListener('registration', async (token) => {
            console.log('[FCM] Token reçu:', token.value.substring(0, 20) + '...');
            
            const lastToken = localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.LAST_TOKEN);
            
            if (token.value !== lastToken) {
                console.log('[FCM] Nouveau token détecté, envoi à l\'API...');
                const success = await sendFCMTokenToAPI(token.value);
                
                if (!success) {
                    console.log('[FCM] Échec de l\'envoi, planification des retries...');
                    retryFCMTokenSend(token.value, 1);
                }
            } else {
                console.log('[FCM] Token identique au précédent, envoi ignoré');
            }
        });
        
        // Listener pour les erreurs d'enregistrement
        await PushNotifications.addListener('registrationError', (error) => {
            console.error('[FCM] Erreur d\'enregistrement:', error);
        });
        
        // Listener pour les notifications reçues (app au premier plan)
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[FCM] Notification reçue (foreground):', notification);
            // Ici on pourrait ajouter une logique pour afficher la notification
        });
        
        // Listener pour les actions sur les notifications
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('[FCM] Action sur notification:', notification);
            // Ici on pourrait gérer les actions (ouvrir l'app, etc.)
        });
        
        // Demander les permissions
        let permStatus = await PushNotifications.checkPermissions();
        console.log('[FCM] Statut permissions:', permStatus.receive);
        
        if (permStatus.receive === 'prompt') {
            console.log('[FCM] Demande de permissions...');
            permStatus = await PushNotifications.requestPermissions();
        }
        
        if (permStatus.receive !== 'granted') {
            console.warn('[FCM] ⚠️  Permissions refusées par l\'utilisateur');
            return;
        }
        
        console.log('[FCM] Permissions accordées, enregistrement...');
        await PushNotifications.register();
        console.log('[FCM] ✅ Enregistrement FCM effectué');

        // Démarrer une vérification périodique pour les tokens en échec
        // (Utile si l'utilisateur n'était pas encore connecté au démarrage)
        setInterval(() => {
            checkAndResendFailedToken();
        }, 30000); // Vérifier toutes les 30 secondes
        
    } catch (error) {
        console.error('[FCM] ❌ Erreur lors de l\'initialisation FCM:', error);
    }
}

/**
 * Obtient les statistiques sur les tokens FCM
 * @returns {Object} Statistiques
 */
function getFCMStats() {
    return {
        lastToken: localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.LAST_TOKEN),
        failedToken: localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN),
        sentAt: localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.SENT_AT),
        retryCount: localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.RETRY_COUNT),
        hasFailedToken: !!localStorage.getItem(FCM_CONFIG.STORAGE_KEYS.FAILED_TOKEN)
    };
}

// Export des fonctions (si module ES6)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeCapacitorFCM,
        sendFCMTokenToAPI,
        retryFCMTokenSend,
        checkAndResendFailedToken,
        getFCMStats,
        isValidFCMToken,
        getSipConfiguration,
        FCM_CONFIG
    };
}
