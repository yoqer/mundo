// Editor de Mundos v6.0 - Sistema de Edición

class WorldEditor {
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
        this.currentWorld = null;
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.tools = {
            brush: { size: 5, color: '#000000' },
            eraser: { size: 10 },
            text: { size: 16, font: 'Arial', color: '#000000' }
        };
        this.currentTool = 'brush';
        this.history = [];
        this.historyStep = -1;
        this.maxHistorySteps = 50;
        
        this.initCanvas();
        this.bindEvents();
    }

    initCanvas() {
        document.addEventListener('DOMContentLoaded', () => {
            this.canvas = document.getElementById('world-editor');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                this.setupCanvas();
            }
        });
    }

    setupCanvas() {
        // Configurar canvas responsivo
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Configurar eventos de dibujo
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Soporte táctil para móviles
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        // Inicializar con fondo blanco
        this.clearCanvas();
        this.saveState();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Mantener proporción 4:3
        const maxWidth = rect.width - 20;
        const maxHeight = rect.height - 20;
        const aspectRatio = 4 / 3;
        
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            // Botones de la barra de herramientas
            const newWorldBtn = document.getElementById('new-world');
            const saveWorldBtn = document.getElementById('save-world');
            const loadWorldBtn = document.getElementById('load-world');
            const exportWorldBtn = document.getElementById('export-world');
            
            if (newWorldBtn) {
                newWorldBtn.addEventListener('click', () => this.newWorld());
            }
            
            if (saveWorldBtn) {
                saveWorldBtn.addEventListener('click', () => this.saveWorld());
            }
            
            if (loadWorldBtn) {
                loadWorldBtn.addEventListener('click', () => this.showLoadDialog());
            }
            
            if (exportWorldBtn) {
                exportWorldBtn.addEventListener('click', () => this.exportWorld());
            }
            
            // Campos de propiedades del mundo
            const worldName = document.getElementById('world-name');
            const worldDescription = document.getElementById('world-description');
            const worldType = document.getElementById('world-type');
            
            if (worldName) {
                worldName.addEventListener('input', () => this.updateWorldProperty('name', worldName.value));
            }
            
            if (worldDescription) {
                worldDescription.addEventListener('input', () => this.updateWorldProperty('description', worldDescription.value));
            }
            
            if (worldType) {
                worldType.addEventListener('change', () => this.updateWorldProperty('type', worldType.value));
            }
            
            // Atajos de teclado
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        });
    }

    // Gestión de mundos
    newWorld() {
        if (this.currentWorld && this.hasUnsavedChanges()) {
            if (!confirm('¿Desea guardar los cambios del mundo actual?')) {
                this.saveWorld();
            }
        }
        
        this.currentWorld = {
            id: this.generateWorldId(),
            name: 'Nuevo Mundo',
            description: '',
            type: 'fantasy',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: this.config.APP.VERSION,
            canvas: null,
            metadata: {
                author: 'Usuario',
                tags: [],
                isPublic: false
            }
        };
        
        this.clearCanvas();
        this.updateUI();
        this.saveState();
    }

    async saveWorld() {
        if (!this.currentWorld) {
            alert('No hay mundo para guardar');
            return;
        }
        
        try {
            // Capturar estado del canvas
            this.currentWorld.canvas = this.canvas.toDataURL();
            this.currentWorld.lastModified = new Date().toISOString();
            
            // Guardar usando el sistema de almacenamiento
            const savedWorld = await this.storage.saveWorld(this.currentWorld);
            this.currentWorld = savedWorld;
            
            this.showNotification('Mundo guardado exitosamente', 'success');
            this.updateUI();
            
        } catch (error) {
            console.error('Error guardando mundo:', error);
            this.showNotification('Error guardando mundo: ' + error.message, 'error');
        }
    }

    async loadWorld(worldId) {
        try {
            const world = await this.storage.loadWorld(worldId);
            this.currentWorld = world;
            
            // Restaurar canvas si existe
            if (world.canvas) {
                const img = new Image();
                img.onload = () => {
                    this.clearCanvas();
                    this.ctx.drawImage(img, 0, 0);
                    this.saveState();
                };
                img.src = world.canvas;
            } else {
                this.clearCanvas();
            }
            
            this.updateUI();
            this.showNotification('Mundo cargado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error cargando mundo:', error);
            this.showNotification('Error cargando mundo: ' + error.message, 'error');
        }
    }

    async showLoadDialog() {
        try {
            const worlds = await this.storage.listWorlds();
            
            if (worlds.length === 0) {
                alert('No hay mundos guardados');
                return;
            }
            
            // Crear diálogo de selección
            const dialog = this.createLoadDialog(worlds);
            document.body.appendChild(dialog);
            
        } catch (error) {
            console.error('Error listando mundos:', error);
            this.showNotification('Error listando mundos: ' + error.message, 'error');
        }
    }

    createLoadDialog(worlds) {
        const dialog = document.createElement('div');
        dialog.className = 'load-dialog modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <h3>Cargar Mundo</h3>
                <div class="worlds-list">
                    ${worlds.map(world => `
                        <div class="world-item" data-world-id="${world.id}">
                            <h4>${world.name}</h4>
                            <p>${world.description || 'Sin descripción'}</p>
                            <small>Tipo: ${world.type} | Modificado: ${new Date(world.lastModified).toLocaleString()}</small>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                </div>
            </div>
        `;
        
        // Agregar eventos de clic a los mundos
        dialog.querySelectorAll('.world-item').forEach(item => {
            item.addEventListener('click', () => {
                const worldId = item.dataset.worldId;
                this.loadWorld(worldId);
                dialog.remove();
            });
        });
        
        return dialog;
    }

    exportWorld() {
        if (!this.currentWorld) {
            alert('No hay mundo para exportar');
            return;
        }
        
        // Crear datos de exportación
        const exportData = {
            ...this.currentWorld,
            canvas: this.canvas.toDataURL(),
            exportedAt: new Date().toISOString(),
            exportVersion: this.config.APP.VERSION
        };
        
        // Crear y descargar archivo JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.currentWorld.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        link.click();
        
        this.showNotification('Mundo exportado exitosamente', 'success');
    }

    // Herramientas de dibujo
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.ctx.lineWidth = this.tools[this.currentTool].size;
        this.ctx.lineCap = 'round';
        
        if (this.currentTool === 'brush') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.tools.brush.color;
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        }
        
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Historial de deshacer/rehacer
    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
        
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
            this.historyStep--;
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState();
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState();
        }
    }

    restoreState() {
        const img = new Image();
        img.onload = () => {
            this.clearCanvas();
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.history[this.historyStep];
    }

    // Utilidades
    updateWorldProperty(property, value) {
        if (this.currentWorld) {
            this.currentWorld[property] = value;
            this.currentWorld.lastModified = new Date().toISOString();
        }
    }

    updateUI() {
        if (!this.currentWorld) return;
        
        const worldName = document.getElementById('world-name');
        const worldDescription = document.getElementById('world-description');
        const worldType = document.getElementById('world-type');
        
        if (worldName) worldName.value = this.currentWorld.name || '';
        if (worldDescription) worldDescription.value = this.currentWorld.description || '';
        if (worldType) worldType.value = this.currentWorld.type || 'fantasy';
    }

    hasUnsavedChanges() {
        // Implementar lógica para detectar cambios no guardados
        return this.currentWorld && this.currentWorld.lastModified;
    }

    generateWorldId() {
        return 'world_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    handleKeyboard(e) {
        // Atajos de teclado
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveWorld();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newWorld();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'o':
                    e.preventDefault();
                    this.showLoadDialog();
                    break;
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // API pública
    getCurrentWorld() {
        return this.currentWorld;
    }

    setTool(tool) {
        if (this.tools[tool]) {
            this.currentTool = tool;
        }
    }

    setToolProperty(tool, property, value) {
        if (this.tools[tool] && this.tools[tool][property] !== undefined) {
            this.tools[tool][property] = value;
        }
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorldEditor;
}

