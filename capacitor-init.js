// ==========================================
// CAPACITOR INTEGRATION (Mobile App Only)
// ==========================================
if (window.Capacitor) {
    console.log("📱 Capacitor detected - Initializing Native Features");

    // Wait for plugins to be available
    window.initCapacitor = async () => {
        // Check if app is configured
        const isConfigured = localStorage.getItem("SipDomain");
        if (!isConfigured) {
            console.log("📱 App not configured yet - skipping Push/VoIP registration");
            return;
        }

        const { PushNotifications } = Capacitor.Plugins;
        // Use CallKitVoip instead of CallKeep
        const CallKitVoip = Capacitor.Plugins.CallKitVoip;
        // CallEvents plugin pour ConnectionService Android
        const CallEvents = Capacitor.Plugins.CallEvents;

        if (!PushNotifications) {
            console.warn("PushNotifications plugin not found");
        }

        // 1. Register for Push (Standard FCM)
        try {
            // Use the logic from capacitor-fcm.js if available
            if (typeof initializeCapacitorFCM === 'function') {
                await initializeCapacitorFCM(true);
            } else {
                if (PushNotifications) {
                    await PushNotifications.requestPermissions();
                    await PushNotifications.register();
                }
            }
            console.log("Push registered");
        } catch (e) {
            console.error("Push registration failed", e);
        }

        // 2. Initialize CallKitVoip (if available)
        if (CallKitVoip) {
            // Expose to window for phone.js usage
            window.CallKitVoip = CallKitVoip;

            try {
                console.log("Initializing CallKitVoip...");
                
                // Register for VoIP notifications
                await CallKitVoip.register();
                console.log("CallKitVoip registered");

                // Listen for VoIP Token (iOS mainly)
                CallKitVoip.addListener('registration', (token) => {
                    console.log('VoIP Token received:', token.value);
                    // TODO: Send this token to server if different from FCM token
                    // For now, we rely on FCM for Android and this for iOS VoIP
                });

                // Listen for Answer (Native UI)
                CallKitVoip.addListener('callAnswered', (data) => {
                    console.log('CallKitVoip callAnswered', data);
                    // data: { id, media, duration, name, ... }
                    
                    // Set a flag to auto-answer the next incoming SIP call
                    window.autoAnswerNextCall = true;

                    // Force SIP Reconnect/Answer logic here
                    if (typeof reconnectXmpp === 'function') {
                        reconnectXmpp();
                    }
                    
                    // If we already have lines, try to answer
                    if (typeof AnswerAudioCall === 'function' && typeof Lines !== 'undefined') {
                        for(var l=0; l<Lines.length; l++) {
                            if(Lines[l].SipSession && Lines[l].SipSession.state === 'Initial') {
                                AnswerAudioCall(Lines[l].LineNumber);
                                window.autoAnswerNextCall = false;
                            }
                        }
                    }
                });

                // Listen for End (Native UI)
                CallKitVoip.addListener('callEnded', (data) => {
                    console.log('CallKitVoip callEnded', data);
                    // TODO: Trigger SIP Hangup here
                    if (typeof HangupCall === 'function' && typeof Lines !== 'undefined') {
                         // Hangup active calls
                         // This is a bit aggressive, maybe check ID?
                    }
                });
                
                // Listen for Call Started (Incoming)
                CallKitVoip.addListener('callStarted', (data) => {
                    console.log('CallKitVoip callStarted', data);
                });

            } catch (e) {
                console.error("CallKitVoip setup failed", e);
            }
        }

        // 2b. Initialize CallEvents (Android ConnectionService)
        if (CallEvents) {
            window.CallEvents = CallEvents;
            
            try {
                console.log("Initializing CallEvents (Android ConnectionService)...");
                
                // Listen for Answer (Android ConnectionService UI)
                CallEvents.addListener('callAnswered', (data) => {
                    console.log('🟢 CallEvents callAnswered (Android)', data);
                    // data: { callId, action: "answered" }
                    
                    // Set a flag to auto-answer the next incoming SIP call
                    window.autoAnswerNextCall = true;

                    // Force SIP Reconnect/Answer logic here
                    if (typeof reconnectXmpp === 'function') {
                        reconnectXmpp();
                    }
                    
                    // If we already have lines, try to answer
                    if (typeof AnswerAudioCall === 'function' && typeof Lines !== 'undefined') {
                        for(var l=0; l<Lines.length; l++) {
                            if(Lines[l].SipSession && Lines[l].SipSession.state === 'Initial') {
                                console.log('Answering SIP call on line', Lines[l].LineNumber);
                                AnswerAudioCall(Lines[l].LineNumber);
                                window.autoAnswerNextCall = false;
                                break;
                            }
                        }
                    }
                });

                // Listen for Reject (Android ConnectionService UI)
                CallEvents.addListener('callRejected', (data) => {
                    console.log('🔴 CallEvents callRejected (Android)', data);
                    // data: { callId, action: "rejected" }
                    
                    // Hangup any incoming calls
                    if (typeof Lines !== 'undefined') {
                        for(var l=0; l<Lines.length; l++) {
                            if(Lines[l].SipSession && Lines[l].SipSession.state === 'Initial') {
                                console.log('Rejecting SIP call on line', Lines[l].LineNumber);
                                // Use appropriate hangup function
                                if (typeof HangupCall === 'function') {
                                    HangupCall(Lines[l].LineNumber);
                                } else if (Lines[l].SipSession.reject) {
                                    Lines[l].SipSession.reject();
                                }
                                break;
                            }
                        }
                    }
                });
                
                console.log("CallEvents listeners registered");
            } catch (e) {
                console.error("CallEvents setup failed", e);
            }
        }

        // 3. Handle Push Notifications (FCM Fallback / Android)
        if (PushNotifications) {
            // Create channel for Android O+
            PushNotifications.createChannel({
                id: 'Push',
                name: 'Appels et Messages',
                description: 'Notifications pour les appels entrants et messages',
                importance: 5, // HIGH
                visibility: 1, // PUBLIC
                sound: 'call_ringtone', // Custom sound if needed
                vibration: true
            }).then(() => console.log('Push channel created')).catch(e => console.error('Channel error', e));

            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push received: ', notification);
                const data = notification.data;
                
                // Check for wake_up or call_keep flag
                if (data.type === 'wake_up' || data.call_keep === 'true' || data.call_keep === true) {
                    console.log('Wake up / Incoming Call detected via FCM');
                    
                    // Refresh SIP globals if available
                    if (typeof getDbItem === 'function') {
                        if (typeof SipDomain !== 'undefined') SipDomain = getDbItem("SipDomain", "");
                        if (typeof SipUsername !== 'undefined') SipUsername = getDbItem("SipUsername", "");
                        if (typeof SipPassword !== 'undefined') SipPassword = getDbItem("SipPassword", "");
                        if (typeof wssServer !== 'undefined') wssServer = getDbItem("wssServer", "");
                    }

                    // Force SIP Reconnect if function exists
                    if (typeof reconnectXmpp === 'function') {
                        reconnectXmpp();
                    }

                    // Force SIP UserAgent Reconnect
                    if (typeof userAgent !== 'undefined' && userAgent) {
                        console.log("Reconnecting SIP UserAgent...");
                        if(userAgent.reconnect) userAgent.reconnect();
                    } else if (typeof CreateUserAgent === 'function') {
                        console.log("Creating SIP UserAgent...");
                        CreateUserAgent();
                    }

                    // Trigger Native Call UI via CallKitVoip
                    if (CallKitVoip) {
                        // Si l'application est au premier plan, on ne déclenche pas la notification native
                        // car l'interface web gérera l'appel entrant via SIP
                        if (document.visibilityState === 'visible') {
                            console.log("App is visible - skipping native CallKit notification");
                            return;
                        }

                        console.log("Triggering CallKitVoip show_call_notification...");
                        const callData = {
                            connectionId: data.id || data.uuid || Date.now().toString(),
                            username: data.name || data.caller_name || "Unknown",
                            callerId: data.caller_number || "Unknown",
                            group: "",
                            message: data.body || "Incoming Call",
                            organization: "CelyaVox",
                            roomname: "",
                            source: "sip",
                            title: data.title || "CelyaVox Call",
                            type: data.media || "audio",
                            duration: data.duration || "30"
                        };
                        CallKitVoip.show_call_notification(callData).catch(err => {
                            console.error("Failed to show call notification", err);
                        });
                    }
                }
            });
        }
    };

    if (document.readyState === 'complete') {
        initCapacitor();
    } else {
        window.addEventListener('load', initCapacitor);
    }
}
