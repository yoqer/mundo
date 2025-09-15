// Editor de Mundos v6.0 - Sistema de Almacenamiento Híbrido

class StorageManager {
    constructor(config) {
        this.config = config;
        this.isOnline = navigator.onLine;
        this.localStorageKey = config.STORAGE.LOCAL_KEY;
        this.cloudEnabled = config.STORAGE.CLOUD_ENABLED;
        
        // Detectar capacidades de almacenamiento
        this.hasLocalStorage = this.checkLocalStorage();
        this.hasIndexedDB = this.checkIndexedDB();
        
        // Inicializar IndexedDB si está disponible
        if (this.hasIndexedDB) {
            this.initIndexedDB();
        }
        
        // Escuchar cambios de conectividad
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    checkLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    checkIndexedDB() {
        return 'indexedDB' in window;
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EditorMundosDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear almacén para mundos
                if (!db.objectStoreNames.contains('worlds')) {
                    const worldsStore = db.createObjectStore('worlds', { keyPath: 'id' });
                    worldsStore.createIndex('name', 'name', { unique: false });
                    worldsStore.createIndex('lastModified', 'lastModified', { unique: false });
                }
                
                // Crear almacén para configuraciones
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                // Crear almacén para cambios pendientes
                if (!db.objectStoreNames.contains('pendingSync')) {
                    const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Guardar mundo
    async saveWorld(worldData) {
        const world = {
            ...worldData,
            id: worldData.id || this.generateId(),
            lastModified: new Date().toISOString(),
            version: this.config.APP.VERSION
        };

        try {
            // Guardar localmente
            await this.saveLocalWorld(world);
            
            // Si está online y la nube está habilitada, sincronizar
            if (this.isOnline && this.cloudEnabled) {
                await this.saveCloudWorld(world);
            } else {
                // Marcar para sincronización posterior
                await this.markForSync(world, 'save');
            }
            
            return world;
        } catch (error) {
            console.error('Error guardando mundo:', error);
            throw error;
        }
    }

    async saveLocalWorld(world) {
        if (this.hasIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['worlds'], 'readwrite');
                const store = transaction.objectStore('worlds');
                const request = store.put(world);
                
                request.onsuccess = () => resolve(world);
                request.onerror = () => reject(request.error);
            });
        } else if (this.hasLocalStorage) {
            const worlds = this.getLocalWorlds();
            worlds[world.id] = world;
            localStorage.setItem(this.localStorageKey + '_worlds', JSON.stringify(worlds));
            return world;
        } else {
            throw new Error('No hay almacenamiento local disponible');
        }
    }

    async saveCloudWorld(world) {
        if (!this.config.API.STORAGE_API) {
            throw new Error('API de almacenamiento no configurada');
        }

        const response = await fetch(this.config.API.STORAGE_API + '/worlds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.API.OPENAI_KEY}`
            },
            body: JSON.stringify(world)
        });

        if (!response.ok) {
            throw new Error(`Error en API: ${response.status}`);
        }

        return await response.json();
    }

    // Cargar mundo
    async loadWorld(worldId) {
        try {
            // Intentar cargar desde la nube primero si está online
            if (this.isOnline && this.cloudEnabled) {
                try {
                    const cloudWorld = await this.loadCloudWorld(worldId);
                    // Actualizar copia local
                    await this.saveLocalWorld(cloudWorld);
                    return cloudWorld;
                } catch (error) {
                    console.warn('Error cargando desde la nube, usando copia local:', error);
                }
            }
            
            // Cargar desde almacenamiento local
            return await this.loadLocalWorld(worldId);
        } catch (error) {
            console.error('Error cargando mundo:', error);
            throw error;
        }
    }

    async loadLocalWorld(worldId) {
        if (this.hasIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['worlds'], 'readonly');
                const store = transaction.objectStore('worlds');
                const request = store.get(worldId);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        reject(new Error('Mundo no encontrado'));
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } else if (this.hasLocalStorage) {
            const worlds = this.getLocalWorlds();
            if (worlds[worldId]) {
                return worlds[worldId];
            } else {
                throw new Error('Mundo no encontrado');
            }
        } else {
            throw new Error('No hay almacenamiento local disponible');
        }
    }

    async loadCloudWorld(worldId) {
        if (!this.config.API.STORAGE_API) {
            throw new Error('API de almacenamiento no configurada');
        }

        const response = await fetch(`${this.config.API.STORAGE_API}/worlds/${worldId}`, {
            headers: {
                'Authorization': `Bearer ${this.config.API.OPENAI_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error en API: ${response.status}`);
        }

        return await response.json();
    }

    // Listar mundos
    async listWorlds() {
        const localWorlds = await this.listLocalWorlds();
        
        if (this.isOnline && this.cloudEnabled) {
            try {
                const cloudWorlds = await this.listCloudWorlds();
                // Combinar y deduplicar mundos
                return this.mergeWorldLists(localWorlds, cloudWorlds);
            } catch (error) {
                console.warn('Error listando mundos de la nube:', error);
            }
        }
        
        return localWorlds;
    }

    async listLocalWorlds() {
        if (this.hasIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['worlds'], 'readonly');
                const store = transaction.objectStore('worlds');
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else if (this.hasLocalStorage) {
            const worlds = this.getLocalWorlds();
            return Object.values(worlds);
        } else {
            return [];
        }
    }

    async listCloudWorlds() {
        if (!this.config.API.STORAGE_API) {
            return [];
        }

        const response = await fetch(`${this.config.API.STORAGE_API}/worlds`, {
            headers: {
                'Authorization': `Bearer ${this.config.API.OPENAI_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error en API: ${response.status}`);
        }

        return await response.json();
    }

    getLocalWorlds() {
        if (!this.hasLocalStorage) return {};
        
        try {
            const stored = localStorage.getItem(this.localStorageKey + '_worlds');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error leyendo mundos locales:', error);
            return {};
        }
    }

    mergeWorldLists(localWorlds, cloudWorlds) {
        const merged = new Map();
        
        // Agregar mundos locales
        localWorlds.forEach(world => {
            merged.set(world.id, world);
        });
        
        // Agregar/actualizar con mundos de la nube (más recientes tienen prioridad)
        cloudWorlds.forEach(cloudWorld => {
            const localWorld = merged.get(cloudWorld.id);
            if (!localWorld || new Date(cloudWorld.lastModified) > new Date(localWorld.lastModified)) {
                merged.set(cloudWorld.id, cloudWorld);
            }
        });
        
        return Array.from(merged.values());
    }

    async markForSync(data, operation) {
        if (!this.hasIndexedDB || !this.db) return;
        
        const syncItem = {
            data: data,
            operation: operation,
            timestamp: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pendingSync'], 'readwrite');
            const store = transaction.objectStore('pendingSync');
            const request = store.add(syncItem);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async syncPendingChanges() {
        if (!this.isOnline || !this.cloudEnabled || !this.hasIndexedDB || !this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pendingSync'], 'readwrite');
            const store = transaction.objectStore('pendingSync');
            const request = store.getAll();
            
            request.onsuccess = async () => {
                const pendingItems = request.result;
                
                for (const item of pendingItems) {
                    try {
                        if (item.operation === 'save') {
                            await this.saveCloudWorld(item.data);
                        }
                        // Eliminar item sincronizado
                        store.delete(item.id);
                    } catch (error) {
                        console.error('Error sincronizando item:', error);
                    }
                }
                
                resolve();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    generateId() {
        return 'world_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Configuraciones
    async saveSetting(key, value) {
        const setting = { key, value, lastModified: new Date().toISOString() };
        
        if (this.hasIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                const request = store.put(setting);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } else if (this.hasLocalStorage) {
            localStorage.setItem(this.localStorageKey + '_setting_' + key, JSON.stringify(setting));
        }
    }

    async loadSetting(key, defaultValue = null) {
        if (this.hasIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.get(key);
                
                request.onsuccess = () => {
                    resolve(request.result ? request.result.value : defaultValue);
                };
                request.onerror = () => resolve(defaultValue);
            });
        } else if (this.hasLocalStorage) {
            try {
                const stored = localStorage.getItem(this.localStorageKey + '_setting_' + key);
                const setting = stored ? JSON.parse(stored) : null;
                return setting ? setting.value : defaultValue;
            } catch (error) {
                return defaultValue;
            }
        }
        
        return defaultValue;
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

