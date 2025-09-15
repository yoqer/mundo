// Editor de Mundos v6.0 - Aplicación Principal

class EditorMundosApp {
    constructor() {
        this.config = null;
        this.storage = null;
        this.voice = null;
        this.sync = null;
        this.editor = null;
        this.currentSection = 'editor';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Iniciando Editor de Mundos v6.0...');
            
            // Mostrar overlay de carga
            this.showLoadingOverlay(true);
            
            // Cargar configuración según el entorno
            this.config = await loadEnvironmentConfig();
            console.log('Configuración cargada:', this.config.APP.VERSION);
            
            // Detectar y mostrar entorno
            const environment = detectEnvironment();
            this.updateEnvironmentStatus(environment);
            
            // Inicializar módulos
            await this.initializeModules();
            
            // Configurar interfaz
            this.setupUI();
            
            // Configurar eventos globales
            this.setupGlobalEvents();
            
            // Cargar configuraciones guardadas
            await this.loadUserSettings();
            
            // Inicializar mundo por defecto si es necesario
            await this.initializeDefaultWorld();
            
            this.isInitialized = true;
            console.log('Editor de Mundos v6.0 inicializado correctamente');
            
            // Ocultar overlay de carga
            this.showLoadingOverlay(false);
            
            // Mostrar notificación de bienvenida
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Error inicializando aplicación:', error);
            this.showErrorMessage('Error inicializando la aplicación: ' + error.message);
            this.showLoadingOverlay(false);
        }
    }

    async initializeModules() {
        // Inicializar almacenamiento
        this.storage = new StorageManager(this.config);
        console.log('Sistema de almacenamiento inicializado');
        
        // Inicializar sincronización
        this.sync = new SyncManager(this.config, this.storage);
        console.log('Sistema de sincronización inicializado');
        
        // Inicializar navegación por voz
        this.voice = new VoiceNavigator(this.config, this);
        console.log('Sistema de navegación por voz inicializado');
        
        // Inicializar editor
        this.editor = new WorldEditor(this.config, this.storage);
        console.log('Editor de mundos inicializado');
    }

    setupUI() {
        // Configurar navegación
        this.setupNavigation();
        
        // Configurar botones de sincronización
        this.setupSyncButtons();
        
        // Configurar configuraciones
        this.setupSettings();
        
        // Mostrar sección inicial
        this.showSection('editor');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });
    }

    setupSyncButtons() {
        const syncNowBtn = document.getElementById('sync-now');
        const forceSyncBtn = document.getElementById('force-sync');
        
        if (syncNowBtn) {
            syncNowBtn.addEventListener('click', () => {
                this.syncNow();
            });
        }
        
        if (forceSyncBtn) {
            forceSyncBtn.addEventListener('click', () => {
                this.forceSync();
            });
        }
    }

    setupSettings() {
        // Auto-save
        const autoSaveCheckbox = document.getElementById('auto-save');
        if (autoSaveCheckbox) {
            autoSaveCheckbox.addEventListener('change', (e) => {
                this.updateSetting('autoSave', e.target.checked);
            });
        }
        
        // Cloud sync
        const cloudSyncCheckbox = document.getElementById('cloud-sync');
        if (cloudSyncCheckbox) {
            cloudSyncCheckbox.addEventListener('change', (e) => {
                this.updateSetting('cloudSync', e.target.checked);
                this.config.STORAGE.CLOUD_ENABLED = e.target.checked;
            });
        }
        
        // Dark mode
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox) {
            darkModeCheckbox.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }
        
        // Voice navigation
        const voiceNavCheckbox = document.getElementById('voice-navigation');
        if (voiceNavCheckbox) {
            voiceNavCheckbox.addEventListener('change', (e) => {
                this.voice.setEnabled(e.target.checked);
                this.updateSetting('voiceNavigation', e.target.checked);
            });
        }
        
        // API configuration
        const testConnectionBtn = document.getElementById('test-connection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testAPIConnection();
            });
        }
    }

    setupGlobalEvents() {
        // Detectar cambios de conectividad
        window.addEventListener('online', () => {
            this.handleConnectivityChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectivityChange(false);
        });
        
        // Auto-guardado
        if (this.config.STORAGE.AUTO_SYNC) {
            setInterval(() => {
                this.autoSave();
            }, 30000); // Cada 30 segundos
        }
        
        // Prevenir pérdida de datos
        window.addEventListener('beforeunload', (e) => {
            if (this.editor && this.editor.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '¿Está seguro de que desea salir? Hay cambios sin guardar.';
            }
        });
    }

    async loadUserSettings() {
        try {
            // Cargar configuraciones del usuario
            const autoSave = await this.storage.loadSetting('autoSave', true);
            const cloudSync = await this.storage.loadSetting('cloudSync', true);
            const darkMode = await this.storage.loadSetting('darkMode', false);
            const voiceNavigation = await this.storage.loadSetting('voiceNavigation', true);
            
            // Aplicar configuraciones a la UI
            const autoSaveCheckbox = document.getElementById('auto-save');
            const cloudSyncCheckbox = document.getElementById('cloud-sync');
            const darkModeCheckbox = document.getElementById('dark-mode');
            const voiceNavCheckbox = document.getElementById('voice-navigation');
            
            if (autoSaveCheckbox) autoSaveCheckbox.checked = autoSave;
            if (cloudSyncCheckbox) cloudSyncCheckbox.checked = cloudSync;
            if (darkModeCheckbox) darkModeCheckbox.checked = darkMode;
            if (voiceNavCheckbox) voiceNavCheckbox.checked = voiceNavigation;
            
            // Aplicar configuraciones
            this.config.STORAGE.CLOUD_ENABLED = cloudSync;
            this.toggleDarkMode(darkMode);
            this.voice.setEnabled(voiceNavigation);
            
        } catch (error) {
            console.error('Error cargando configuraciones del usuario:', error);
        }
    }

    async initializeDefaultWorld() {
        try {
            const worlds = await this.storage.listWorlds();
            if (worlds.length === 0) {
                // Crear mundo de ejemplo
                this.editor.newWorld();
                this.editor.currentWorld.name = 'Mi Primer Mundo';
                this.editor.currentWorld.description = 'Un mundo de ejemplo para comenzar';
                this.editor.updateUI();
            }
        } catch (error) {
            console.error('Error inicializando mundo por defecto:', error);
        }
    }

    // Navegación entre secciones
    showSection(sectionName) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Actualizar navegación
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });
        
        this.currentSection = sectionName;
        
        // Cargar contenido específico de la sección
        this.loadSectionContent(sectionName);
    }

    async loadSectionContent(sectionName) {
        switch (sectionName) {
            case 'worlds':
                await this.loadWorldsGrid();
                break;
            case 'sync':
                this.updateSyncStatus();
                break;
        }
    }

    async loadWorldsGrid() {
        try {
            const worlds = await this.storage.listWorlds();
            const worldsGrid = document.getElementById('worlds-grid');
            
            if (worldsGrid) {
                if (worlds.length === 0) {
                    worldsGrid.innerHTML = '<p>No hay mundos guardados. <a href="#" onclick="app.createNewWorld()">Crear el primero</a></p>';
                } else {
                    worldsGrid.innerHTML = worlds.map(world => `
                        <div class="world-card" data-world-id="${world.id}">
                            <div class="world-preview">
                                ${world.canvas ? `<img src="${world.canvas}" alt="${world.name}">` : '<div class="no-preview">Sin vista previa</div>'}
                            </div>
                            <div class="world-info">
                                <h3>${world.name}</h3>
                                <p>${world.description || 'Sin descripción'}</p>
                                <div class="world-meta">
                                    <span class="world-type">${world.type}</span>
                                    <span class="world-date">${new Date(world.lastModified).toLocaleDateString()}</span>
                                </div>
                                <div class="world-actions">
                                    <button class="btn btn-sm btn-primary" onclick="app.loadWorld('${world.id}')">Abrir</button>
                                    <button class="btn btn-sm btn-danger" onclick="app.deleteWorld('${world.id}')">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error cargando mundos:', error);
            this.showNotification('Error cargando mundos: ' + error.message, 'error');
        }
    }

    // Métodos públicos para comandos de voz
    createNewWorld() {
        this.showSection('editor');
        this.editor.newWorld();
    }

    async loadWorld(worldId) {
        this.showSection('editor');
        await this.editor.loadWorld(worldId);
    }

    async deleteWorld(worldId) {
        if (confirm('¿Está seguro de que desea eliminar este mundo?')) {
            try {
                // Implementar eliminación en el storage
                await this.storage.deleteWorld(worldId);
                this.showNotification('Mundo eliminado', 'success');
                if (this.currentSection === 'worlds') {
                    await this.loadWorldsGrid();
                }
            } catch (error) {
                console.error('Error eliminando mundo:', error);
                this.showNotification('Error eliminando mundo: ' + error.message, 'error');
            }
        }
    }

    async saveCurrentWorld() {
        if (this.editor) {
            await this.editor.saveWorld();
        }
    }

    async syncNow() {
        try {
            await this.sync.forcSync();
            this.showNotification('Sincronización completada', 'success');
        } catch (error) {
            console.error('Error en sincronización:', error);
            this.showNotification('Error en sincronización: ' + error.message, 'error');
        }
    }

    async forceSync() {
        if (confirm('¿Está seguro de que desea forzar la sincronización? Esto puede sobrescribir cambios locales.')) {
            await this.syncNow();
        }
    }

    async autoSave() {
        if (this.editor && this.editor.currentWorld && this.editor.hasUnsavedChanges()) {
            try {
                await this.editor.saveWorld();
                console.log('Auto-guardado realizado');
            } catch (error) {
                console.error('Error en auto-guardado:', error);
            }
        }
    }

    // Configuraciones
    async updateSetting(key, value) {
        try {
            await this.storage.saveSetting(key, value);
            console.log(`Configuración ${key} actualizada:`, value);
        } catch (error) {
            console.error('Error guardando configuración:', error);
        }
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateSetting('darkMode', enabled);
    }

    async testAPIConnection() {
        try {
            this.showNotification('Probando conexión...', 'info');
            
            // Probar conexión con la API
            const response = await fetch(this.config.RECOVERY.WEB_CONFIG_URL);
            
            if (response.ok) {
                this.showNotification('Conexión exitosa', 'success');
            } else {
                this.showNotification('Error de conexión: ' + response.status, 'error');
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            this.showNotification('Error de conexión: ' + error.message, 'error');
        }
    }

    // Utilidades de UI
    updateEnvironmentStatus(environment) {
        const envStatus = document.getElementById('environment-status');
        if (envStatus) {
            const envLabels = {
                'web': '🌐 Web',
                'codespaces': '☁️ Codespaces',
                'local': '🖥️ Local',
                'unknown': '❓ Desconocido'
            };
            envStatus.textContent = envLabels[environment.type] || envLabels.unknown;
        }
    }

    handleConnectivityChange(isOnline) {
        const status = isOnline ? 'Conectado' : 'Desconectado';
        this.showNotification(`Estado de conexión: ${status}`, isOnline ? 'success' : 'warning');
    }

    updateSyncStatus() {
        if (this.sync) {
            const status = this.sync.getStatus();
            const syncStatusElement = document.getElementById('sync-status');
            const lastSyncElement = document.getElementById('last-sync');
            
            if (syncStatusElement) {
                syncStatusElement.textContent = status.isOnline ? 'Conectado' : 'Desconectado';
            }
            
            if (lastSyncElement && status.lastSyncTime) {
                const lastSync = new Date(status.lastSyncTime);
                lastSyncElement.textContent = lastSync.toLocaleString();
            }
        }
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showWelcomeMessage() {
        const environment = detectEnvironment();
        let message = `Bienvenido al Editor de Mundos v${this.config.APP.VERSION}`;
        
        if (environment.type === 'codespaces') {
            message += ' (ejecutándose en GitHub Codespaces)';
        } else if (environment.type === 'local') {
            message += ' (ejecutándose localmente)';
        } else if (environment.type === 'web') {
            message += ' (versión web completa)';
        }
        
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>Error de Inicialización</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Reintentar</button>
        `;
        document.body.appendChild(errorDiv);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Posicionar en la esquina superior derecha
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '10000';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '5px';
        notification.style.color = 'white';
        notification.style.fontWeight = 'bold';
        
        // Colores según el tipo
        const colors = {
            'success': '#4CAF50',
            'error': '#f44336',
            'warning': '#ff9800',
            'info': '#2196F3'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // API pública
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentSection: this.currentSection,
            environment: detectEnvironment(),
            modules: {
                storage: !!this.storage,
                sync: !!this.sync,
                voice: !!this.voice,
                editor: !!this.editor
            }
        };
    }
}

// Inicializar aplicación cuando el DOM esté listo
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EditorMundosApp();
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EditorMundosApp = EditorMundosApp;
}

