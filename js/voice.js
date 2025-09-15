// Editor de Mundos v6.0 - Sistema de Navegación por Voz

class VoiceNavigator {
    constructor(config, app) {
        this.config = config;
        this.app = app;
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.commands = config.VOICE.COMMANDS;
        this.language = config.VOICE.LANGUAGE;
        
        // Verificar soporte del navegador
        this.isSupported = this.checkSupport();
        
        if (this.isSupported) {
            this.initRecognition();
        }
        
        // Elementos del DOM
        this.voiceButton = null;
        this.voiceModal = null;
        
        this.bindEvents();
    }

    checkSupport() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Reconocimiento de voz no soportado en este navegador');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceUI(true);
            this.speak('Escuchando comandos de voz');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceUI(false);
        };

        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            this.isListening = false;
            this.updateVoiceUI(false);
            
            if (event.error === 'not-allowed') {
                this.speak('Permiso de micrófono denegado');
            } else if (event.error === 'no-speech') {
                this.speak('No se detectó voz');
            }
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.processCommand(finalTranscript.toLowerCase().trim());
            }
        };
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.voiceButton = document.getElementById('voice-toggle');
            this.voiceModal = document.getElementById('voice-modal');
            const stopVoiceButton = document.getElementById('stop-voice');

            if (this.voiceButton) {
                this.voiceButton.addEventListener('click', () => {
                    this.toggleListening();
                });
            }

            if (stopVoiceButton) {
                stopVoiceButton.addEventListener('click', () => {
                    this.stopListening();
                });
            }

            // Atajos de teclado
            document.addEventListener('keydown', (event) => {
                // Ctrl + Shift + V para activar/desactivar voz
                if (event.ctrlKey && event.shiftKey && event.key === 'V') {
                    event.preventDefault();
                    this.toggleListening();
                }
                
                // Escape para detener reconocimiento
                if (event.key === 'Escape' && this.isListening) {
                    this.stopListening();
                }
            });
        });
    }

    toggleListening() {
        if (!this.isSupported) {
            this.speak('Reconocimiento de voz no soportado en este navegador');
            return;
        }

        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.recognition || this.isListening) return;

        try {
            this.recognition.start();
            this.showVoiceModal();
        } catch (error) {
            console.error('Error iniciando reconocimiento:', error);
            this.speak('Error al iniciar reconocimiento de voz');
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;

        this.recognition.stop();
        this.hideVoiceModal();
        this.speak('Reconocimiento de voz detenido');
    }

    processCommand(command) {
        console.log('Comando recibido:', command);
        
        // Buscar comando exacto
        if (this.commands[command]) {
            this.executeCommand(this.commands[command], command);
            return;
        }

        // Buscar comandos parciales
        for (const [voiceCommand, action] of Object.entries(this.commands)) {
            if (command.includes(voiceCommand)) {
                this.executeCommand(action, voiceCommand);
                return;
            }
        }

        // Comandos adicionales específicos
        if (command.includes('crear') && command.includes('mundo')) {
            this.executeCommand('newWorld', 'crear mundo');
        } else if (command.includes('abrir') && command.includes('mundo')) {
            this.executeCommand('showWorlds', 'abrir mundo');
        } else if (command.includes('modo') && command.includes('oscuro')) {
            this.executeCommand('toggleDarkMode', 'modo oscuro');
        } else if (command.includes('ayuda')) {
            this.executeCommand('showHelp', 'ayuda');
        } else {
            this.speak('Comando no reconocido: ' + command);
            console.log('Comando no reconocido:', command);
        }
    }

    executeCommand(action, originalCommand) {
        console.log('Ejecutando comando:', action, 'para:', originalCommand);
        
        try {
            switch (action) {
                case 'showSection':
                    if (originalCommand.includes('editor')) {
                        this.app.showSection('editor');
                        this.speak('Abriendo editor');
                    } else if (originalCommand.includes('mundos')) {
                        this.app.showSection('worlds');
                        this.speak('Mostrando mundos');
                    } else if (originalCommand.includes('configuración')) {
                        this.app.showSection('settings');
                        this.speak('Abriendo configuración');
                    }
                    break;
                    
                case 'showWorlds':
                    this.app.showSection('worlds');
                    this.speak('Mostrando lista de mundos');
                    break;
                    
                case 'newWorld':
                    this.app.createNewWorld();
                    this.speak('Creando nuevo mundo');
                    break;
                    
                case 'saveWorld':
                    this.app.saveCurrentWorld();
                    this.speak('Guardando mundo actual');
                    break;
                    
                case 'syncNow':
                    this.app.syncNow();
                    this.speak('Iniciando sincronización');
                    break;
                    
                case 'toggleDarkMode':
                    this.app.toggleDarkMode();
                    this.speak('Cambiando modo de visualización');
                    break;
                    
                case 'showHelp':
                    this.showVoiceHelp();
                    this.speak('Mostrando ayuda de comandos de voz');
                    break;
                    
                default:
                    console.warn('Acción no implementada:', action);
                    this.speak('Comando reconocido pero no implementado');
            }
        } catch (error) {
            console.error('Error ejecutando comando:', error);
            this.speak('Error ejecutando comando');
        }
    }

    speak(text) {
        if (!this.synthesis) return;

        // Cancelar cualquier síntesis en curso
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        // Buscar voz en español si está disponible
        const voices = this.synthesis.getVoices();
        const spanishVoice = voices.find(voice => 
            voice.lang.startsWith('es') || voice.lang.includes('Spanish')
        );
        
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }

        this.synthesis.speak(utterance);
    }

    updateVoiceUI(isListening) {
        if (this.voiceButton) {
            if (isListening) {
                this.voiceButton.textContent = '🔴 Escuchando';
                this.voiceButton.classList.add('listening');
            } else {
                this.voiceButton.textContent = '🎤 Voz';
                this.voiceButton.classList.remove('listening');
            }
        }
    }

    showVoiceModal() {
        if (this.voiceModal) {
            this.voiceModal.style.display = 'flex';
        }
    }

    hideVoiceModal() {
        if (this.voiceModal) {
            this.voiceModal.style.display = 'none';
        }
    }

    showVoiceHelp() {
        const helpText = `
        Comandos de voz disponibles:
        - "Ir a editor" - Abrir el editor de mundos
        - "Ir a mundos" - Ver lista de mundos
        - "Guardar mundo" - Guardar el mundo actual
        - "Nuevo mundo" - Crear un nuevo mundo
        - "Configuración" - Abrir configuración
        - "Sincronizar" - Sincronizar con la nube
        - "Modo oscuro" - Cambiar tema visual
        - "Ayuda" - Mostrar esta ayuda
        `;
        
        alert(helpText);
    }

    // Método para habilitar/deshabilitar navegación por voz
    setEnabled(enabled) {
        if (enabled && this.isSupported) {
            this.config.VOICE.ENABLED = true;
            if (this.voiceButton) {
                this.voiceButton.style.display = 'block';
            }
        } else {
            this.config.VOICE.ENABLED = false;
            if (this.isListening) {
                this.stopListening();
            }
            if (this.voiceButton) {
                this.voiceButton.style.display = 'none';
            }
        }
    }

    // Obtener estado del reconocimiento
    getStatus() {
        return {
            isSupported: this.isSupported,
            isEnabled: this.config.VOICE.ENABLED,
            isListening: this.isListening,
            language: this.language
        };
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceNavigator;
}

