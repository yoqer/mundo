// Editor de Mundos v6.0 - Sistema de Sincronización

class SyncManager {
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        // Detectar entorno
        this.environment = this.detectEnvironment();
        
        // Configurar intervalos de sincronización
        this.setupSyncInterval();
        
        // Escuchar cambios de conectividad
        this.setupConnectivityListeners();
        
        // Cargar último tiempo de sincronización
        this.loadLastSyncTime();
    }

    detectEnvironment() {
        if (typeof window === 'undefined') return 'server';
        
        const hostname = window.location.hostname;
        
        if (hostname.includes('github.dev') || hostname.includes('codespaces')) {
            return 'codespaces';
        } else if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            return 'local';
        } else if (hostname.includes('maxxine.net')) {
            return 'web';
        }
        
        return 'unknown';
    }

    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus(true);
            this.processSyncQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus(false);
        });
    }

    setupSyncInterval() {
        if (this.config.STORAGE.AUTO_SYNC) {
            setInterval(() => {
                if (this.isOnline && !this.syncInProgress) {
                    this.syncAll();
                }
            }, this.config.STORAGE.BACKUP_INTERVAL);
        }
    }

    async loadLastSyncTime() {
        try {
            this.lastSyncTime = await this.storage.loadSetting('lastSyncTime');
            this.updateSyncStatus();
        } catch (error) {
            console.error('Error cargando tiempo de última sincronización:', error);
        }
    }

    async saveLastSyncTime() {
        this.lastSyncTime = new Date().toISOString();
        try {
            await this.storage.saveSetting('lastSyncTime', this.lastSyncTime);
            this.updateSyncStatus();
        } catch (error) {
            console.error('Error guardando tiempo de sincronización:', error);
        }
    }

    // Sincronización completa
    async syncAll() {
        if (this.syncInProgress) {
            console.log('Sincronización ya en progreso');
            return;
        }

        this.syncInProgress = true;
        this.updateSyncUI(true);

        try {
            console.log('Iniciando sincronización completa...');
            
            // Sincronizar mundos
            await this.syncWorlds();
            
            // Sincronizar configuraciones
            await this.syncSettings();
            
            // Procesar cola de sincronización
            await this.processSyncQueue();
            
            await this.saveLastSyncTime();
            this.retryAttempts = 0;
            
            console.log('Sincronización completa exitosa');
            this.showSyncNotification('Sincronización completada', 'success');
            
        } catch (error) {
            console.error('Error en sincronización:', error);
            this.handleSyncError(error);
        } finally {
            this.syncInProgress = false;
            this.updateSyncUI(false);
        }
    }

    async syncWorlds() {
        if (this.environment === 'web') {
            // En la web, solo sincronizar con almacenamiento local
            return;
        }

        try {
            // Obtener mundos locales
            const localWorlds = await this.storage.listLocalWorlds();
            
            // Obtener mundos de la web
            const webWorlds = await this.fetchWebWorlds();
            
            // Resolver conflictos y sincronizar
            const mergedWorlds = this.mergeWorlds(localWorlds, webWorlds);
            
            // Actualizar almacenamiento local
            for (const world of mergedWorlds) {
                await this.storage.saveLocalWorld(world);
            }
            
            // Enviar cambios a la web si es necesario
            await this.pushWorldsToWeb(mergedWorlds);
            
        } catch (error) {
            console.error('Error sincronizando mundos:', error);
            throw error;
        }
    }

    async fetchWebWorlds() {
        if (!this.isOnline) {
            throw new Error('Sin conexión a internet');
        }

        const endpoint = this.getWebEndpoint('/api/worlds');
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error obteniendo mundos de la web:', error);
            throw error;
        }
    }

    async pushWorldsToWeb(worlds) {
        if (!this.isOnline || this.environment === 'web') {
            return;
        }

        const endpoint = this.getWebEndpoint('/api/worlds/sync');
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    worlds: worlds,
                    environment: this.environment,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error enviando mundos a la web:', error);
            throw error;
        }
    }

    mergeWorlds(localWorlds, webWorlds) {
        const merged = new Map();
        
        // Agregar mundos locales
        localWorlds.forEach(world => {
            merged.set(world.id, {
                ...world,
                source: 'local'
            });
        });
        
        // Procesar mundos de la web
        webWorlds.forEach(webWorld => {
            const localWorld = merged.get(webWorld.id);
            
            if (!localWorld) {
                // Mundo solo existe en la web
                merged.set(webWorld.id, {
                    ...webWorld,
                    source: 'web'
                });
            } else {
                // Resolver conflicto por fecha de modificación
                const localDate = new Date(localWorld.lastModified);
                const webDate = new Date(webWorld.lastModified);
                
                if (webDate > localDate) {
                    merged.set(webWorld.id, {
                        ...webWorld,
                        source: 'web'
                    });
                } else {
                    merged.set(localWorld.id, {
                        ...localWorld,
                        source: 'local'
                    });
                }
            }
        });
        
        return Array.from(merged.values());
    }

    async syncSettings() {
        // Sincronizar configuraciones específicas
        const settingsToSync = [
            'darkMode',
            'autoSave',
            'voiceNavigation',
            'language'
        ];

        for (const setting of settingsToSync) {
            try {
                const localValue = await this.storage.loadSetting(setting);
                if (localValue !== null) {
                    await this.pushSettingToWeb(setting, localValue);
                }
            } catch (error) {
                console.error(`Error sincronizando configuración ${setting}:`, error);
            }
        }
    }

    async pushSettingToWeb(key, value) {
        if (!this.isOnline || this.environment === 'web') {
            return;
        }

        const endpoint = this.getWebEndpoint('/api/settings');
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: key,
                    value: value,
                    environment: this.environment,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error enviando configuración a la web:', error);
            throw error;
        }
    }

    // Cola de sincronización para operaciones offline
    addToSyncQueue(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            attempts: 0
        });
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        const processedItems = [];
        
        for (const item of this.syncQueue) {
            try {
                await this.processSyncItem(item);
                processedItems.push(item);
            } catch (error) {
                console.error('Error procesando item de sincronización:', error);
                item.attempts++;
                
                if (item.attempts >= this.maxRetries) {
                    console.error('Máximo de reintentos alcanzado para item:', item);
                    processedItems.push(item);
                }
            }
        }
        
        // Remover items procesados
        this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item));
    }

    async processSyncItem(item) {
        switch (item.type) {
            case 'saveWorld':
                await this.pushWorldsToWeb([item.data]);
                break;
            case 'saveSetting':
                await this.pushSettingToWeb(item.key, item.value);
                break;
            default:
                console.warn('Tipo de sincronización desconocido:', item.type);
        }
    }

    // Utilidades
    getWebEndpoint(path) {
        const baseUrl = this.config.RECOVERY.API_PROXY_URL || 'https://maxxine.net';
        return baseUrl + path;
    }

    getAuthHeaders() {
        const headers = {};
        
        if (this.environment !== 'web') {
            // Para GitHub/Local, usar token de autenticación
            headers['Authorization'] = `Bearer ${this.generateAuthToken()}`;
        }
        
        headers['X-Environment'] = this.environment;
        headers['X-Client-Version'] = this.config.APP.VERSION;
        
        return headers;
    }

    generateAuthToken() {
        // Generar token basado en el entorno y configuración
        const data = {
            environment: this.environment,
            timestamp: Date.now(),
            version: this.config.APP.VERSION
        };
        
        return btoa(JSON.stringify(data));
    }

    handleSyncError(error) {
        this.retryAttempts++;
        
        if (this.retryAttempts < this.maxRetries) {
            console.log(`Reintentando sincronización (${this.retryAttempts}/${this.maxRetries})...`);
            setTimeout(() => {
                this.syncAll();
            }, 5000 * this.retryAttempts);
        } else {
            console.error('Máximo de reintentos de sincronización alcanzado');
            this.showSyncNotification('Error de sincronización. Verifique su conexión.', 'error');
        }
    }

    // Métodos de UI
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = isOnline ? '🌐 Online' : '📴 Offline';
            statusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
    }

    updateSyncStatus() {
        const syncStatusElement = document.getElementById('sync-status');
        const lastSyncElement = document.getElementById('last-sync');
        
        if (syncStatusElement) {
            syncStatusElement.textContent = this.isOnline ? 'Conectado' : 'Desconectado';
        }
        
        if (lastSyncElement && this.lastSyncTime) {
            const lastSync = new Date(this.lastSyncTime);
            lastSyncElement.textContent = lastSync.toLocaleString();
        }
    }

    updateSyncUI(inProgress) {
        const syncButton = document.getElementById('sync-now');
        if (syncButton) {
            syncButton.disabled = inProgress;
            syncButton.textContent = inProgress ? 'Sincronizando...' : 'Sincronizar Ahora';
        }
    }

    showSyncNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `sync-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // API pública
    async forcSync() {
        return await this.syncAll();
    }

    getStatus() {
        return {
            isOnline: this.isOnline,
            environment: this.environment,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            queueLength: this.syncQueue.length
        };
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
}

