// Editor de Mundos v6.0 - Configuración
// NOTA: Este archivo contiene claves API sensibles para la versión web

const CONFIG = {
    // Configuración de entorno
    ENVIRONMENT: {
        isCodespaces: typeof window !== 'undefined' && window.location.hostname.includes('github'),
        isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
        isWeb: typeof window !== 'undefined' && window.location.hostname.includes('maxxine.net')
    },

    // APIs y claves sensibles (recuperadas desde la web)
    API: {
        OPENAI_KEY: null, // Se recupera desde la web
        OPENAI_ENDPOINT: 'https://api.openai.com/v1',
        STORAGE_API: null, // Se recupera desde la web
        SYNC_ENDPOINT: null, // Se recupera desde la web
        BACKUP_ENDPOINT: null // Se recupera desde la web
    },

    // Configuración de almacenamiento
    STORAGE: {
        LOCAL_KEY: 'editor-mundos-v6',
        CLOUD_ENABLED: true,
        AUTO_SYNC: true,
        BACKUP_INTERVAL: 300000 // 5 minutos
    },

    // Configuración de voz
    VOICE: {
        ENABLED: true,
        LANGUAGE: 'es-ES',
        COMMANDS: {
            'ir a editor': 'showSection',
            'ir a mundos': 'showWorlds',
            'guardar mundo': 'saveWorld',
            'nuevo mundo': 'newWorld',
            'configuración': 'showSettings',
            'sincronizar': 'syncNow'
        }
    },

    // URLs de recuperación para versiones GitHub/Local
    RECOVERY: {
        WEB_CONFIG_URL: 'https://maxxine.net/html/editor-mundos/config/secure-config.json',
        API_PROXY_URL: 'https://maxxine.net/html/editor-mundos/api/proxy',
        AUTH_ENDPOINT: 'https://maxxine.net/html/editor-mundos/auth/validate'
    },

    // Configuración de la aplicación
    APP: {
        VERSION: '6.6',
        NAME: 'Editor de Mundos',
        AUTHOR: 'Maxxine Systems',
        UPDATE_CHECK_URL: 'https://maxxine.net/html/editor-mundos/version.json'
    }
};

// Función para detectar entorno automáticamente
function detectEnvironment() {
    const env = {
        isCodespaces: false,
        isLocal: false,
        isWeb: false,
        type: 'unknown'
    };

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        if (hostname.includes('github.dev') || hostname.includes('codespaces')) {
            env.isCodespaces = true;
            env.type = 'codespaces';
        } else if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            env.isLocal = true;
            env.type = 'local';
        } else if (hostname.includes('maxxine.net')) {
            env.isWeb = true;
            env.type = 'web';
        }
    }

    return env;
}

// Función para cargar configuración según el entorno
async function loadEnvironmentConfig() {
    const env = detectEnvironment();
    
    if (env.isWeb) {
        // En la web, usar configuración completa
        return CONFIG;
    } else {
        // En GitHub/Local, recuperar configuración desde la web
        try {
            const response = await fetch(CONFIG.RECOVERY.WEB_CONFIG_URL);
            const webConfig = await response.json();
            
            // Combinar configuración local con la recuperada
            return {
                ...CONFIG,
                API: webConfig.API,
                STORAGE: {
                    ...CONFIG.STORAGE,
                    CLOUD_ENABLED: true
                }
            };
        } catch (error) {
            console.warn('No se pudo recuperar configuración web, usando modo offline:', error);
            return {
                ...CONFIG,
                API: {
                    ...CONFIG.API,
                    OPENAI_KEY: null,
                    STORAGE_API: null,
                    SYNC_ENDPOINT: null
                },
                STORAGE: {
                    ...CONFIG.STORAGE,
                    CLOUD_ENABLED: false
                }
            };
        }
    }
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, detectEnvironment, loadEnvironmentConfig };
}

