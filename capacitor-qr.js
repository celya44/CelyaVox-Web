(function(){
    var overlayId = "qr-scan-overlay";
    var overlayTextId = "qr-scan-overlay-text";
    var styleId = "qr-scan-overlay-style";

    function getBarcodeScanner(){
        if(typeof window === "undefined") return null;
        if(window.Capacitor && window.Capacitor.Plugins){
            if(window.Capacitor.Plugins.BarcodeScanner) return window.Capacitor.Plugins.BarcodeScanner;
        }
        if(typeof window.BarcodeScanner !== "undefined") return window.BarcodeScanner;
        return null;
    }

    function isNativeCapacitor(){
        if(typeof window === "undefined" || !window.Capacitor) return false;
        if(typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()){ return true; }
        if(typeof window.Capacitor.getPlatform === "function"){
            var platform = window.Capacitor.getPlatform();
            if(platform === "ios" || platform === "android") return true;
        }
        return !!window.Capacitor.isNative;
    }

    function ensureStyles(){
        if(typeof document === "undefined") return;
        if(document.getElementById(styleId)) return;
        var style = document.createElement("style");
        style.id = styleId;
        style.textContent = ".qr-scan-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:10000;text-align:center;padding:24px;}"+
            ".qr-scan-overlay--visible{display:flex;}"+
            ".qr-scan-overlay__spinner{width:56px;height:56px;border-radius:999px;border:4px solid rgba(255,255,255,0.25);border-top-color:#fff;animation:qr-scan-spin 1s linear infinite;margin-bottom:16px;}"+
            ".qr-scan-overlay__text{font-size:16px;line-height:1.4;max-width:260px;}"+
            "body.qr-scan-block-scroll{overflow:hidden!important;}"+
            "@keyframes qr-scan-spin{to{transform:rotate(360deg);}}";
        document.head.appendChild(style);
    }

    function showOverlay(message){
        if(typeof document === "undefined") return;
        ensureStyles();
        var overlay = document.getElementById(overlayId);
        if(!overlay){
            overlay = document.createElement("div");
            overlay.id = overlayId;
            overlay.className = "qr-scan-overlay";
            overlay.innerHTML = "<div class=\"qr-scan-overlay__spinner\" aria-hidden=\"true\"></div><p id=\""+ overlayTextId +"\" class=\"qr-scan-overlay__text\"></p>";
            document.body.appendChild(overlay);
        }
        var textNode = document.getElementById(overlayTextId);
        if(textNode) textNode.textContent = message || "Scan en cours";
        overlay.classList.add("qr-scan-overlay--visible");
        document.body.classList.add("qr-scan-block-scroll");
    }

    function hideOverlay(){
        if(typeof document === "undefined") return;
        var overlay = document.getElementById(overlayId);
        if(overlay) overlay.classList.remove("qr-scan-overlay--visible");
        if(document.body) document.body.classList.remove("qr-scan-block-scroll");
    }

    function normalizeUrl(candidate){
        if(!candidate) return "";
        var trimmed = candidate.trim();
        if(trimmed === "") return "";
        if(/^https?:\/\//i.test(trimmed)) return trimmed;
        try {
            var parsed = new URL(trimmed);
            return parsed.toString();
        } catch (err){
            return "https://" + trimmed.replace(/^[\/]+/, "");
        }
    }

    function hasCameraPermission(status){
        if(!status) return false;
        var value = status.camera || status;
        return value === "granted" || value === "limited" || value === true;
    }

    async function ensurePermission(scanner){
        if(!scanner) return false;
        if(typeof scanner.checkPermissions === "function"){
            try {
                var current = await scanner.checkPermissions();
                if(hasCameraPermission(current)) return true;
            } catch (err) {}
        }
        if(typeof scanner.requestPermissions === "function"){
            try {
                var requested = await scanner.requestPermissions();
                if(hasCameraPermission(requested)) return true;
            } catch (err) {}
        }
        if(typeof scanner.openSettings === "function"){
            try { await scanner.openSettings(); } catch (err) {}
        }
        return false;
    }

    async function ensureSupport(scanner){
        if(!scanner || typeof scanner.isSupported !== "function") return true;
        try {
            var result = await scanner.isSupported();
            return !!(result && result.supported);
        } catch (err){
            return false;
        }
    }

    function extractBarcodeValue(result){
        if(!result || !result.barcodes || !result.barcodes.length) return null;
        var first = result.barcodes[0];
        var text = first.displayValue || first.rawValue;
        if(typeof text === "string") return text.trim();
        return null;
    }

    async function startScan(){
        var scanner = getBarcodeScanner();
        if(!scanner) throw new Error("Plugin BarcodeScanner indisponible");

        var supported = await ensureSupport(scanner);
        if(!supported) throw new Error("Le scanner n'est pas disponible sur cet appareil");

        var permissionOk = await ensurePermission(scanner);
        if(!permissionOk) return null;

        showOverlay("Initialisation du scanner...");
        try {
            var result = await scanner.scan ? await scanner.scan({ formats: ["QR_CODE"] }) : null;
            if(!result && typeof scanner.startScan === "function"){
                // Fallback to legacy API if available
                result = await new Promise(function(resolve, reject){
                    var handler;
                    scanner.addListener && scanner.addListener("barcodeScanned", function(event){
                        if(handler && typeof handler.remove === "function") handler.remove();
                        resolve({ barcodes: [event.barcode] });
                    }).then(function(sub){ handler = sub; }).catch(function(err){ reject(err); });
                    scanner.startScan({ formats: ["QR_CODE"] }).catch(reject);
                });
            }
            return extractBarcodeValue(result);
        } catch (err){
            var message = (err && err.message) ? err.message.toLowerCase() : "";
            if(message.indexOf("canceled") !== -1 || message.indexOf("cancelled") !== -1){
                return null;
            }
            throw err;
        } finally {
            if(scanner && typeof scanner.stopScan === "function"){
                try { await scanner.stopScan(); } catch (err) {}
            }
            hideOverlay();
        }
    }

    window.capacitorQrScanner = {
        isAvailable: function(){
            return isNativeCapacitor() && !!getBarcodeScanner();
        },
        scanForConfigUrl: async function(){
            if(!this.isAvailable()) throw new Error("Lecture QR indisponible");
            var raw = await startScan();
            if(!raw) return null;
            return normalizeUrl(raw);
        }
    };
})();
