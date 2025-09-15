# Editor de Mundos v6.6

Editor de mundos híbrido con funcionalidades online/offline, navegación por voz y sincronización automática.

## 🚀 Características

- ✨ **Sistema Híbrido**: Funciona online y offline con detección automática de entorno
- 🎤 **Navegación por Voz**: Control completo mediante comandos de voz en español
- 🔄 **Sincronización Automática**: Sincronización entre dispositivos y versiones
- 🎨 **Editor Visual**: Canvas interactivo para crear mundos
- 📱 **Responsive**: Compatible con escritorio y móvil
- 🌙 **Modo Oscuro**: Interfaz adaptable
- 💾 **Almacenamiento Local**: IndexedDB y LocalStorage
- 🔧 **Detección de Entorno**: Adaptación automática según el entorno
- ☁️ **GitHub Codespaces**: Optimizado para desarrollo en la nube

## 🌍 Entornos Soportados

- **🌐 Web**: Versión completa con todas las funcionalidades en https://maxxine.net/html/editor-mundos/
- **☁️ GitHub Codespaces**: Versión adaptada para desarrollo que se conecta a la versión web
- **🖥️ Local**: Versión para desarrollo local con funcionalidad híbrida

## 📦 Instalación y Uso

### En GitHub Codespaces
1. Abre este repositorio en Codespaces
2. La aplicación se iniciará automáticamente
3. Se conectará a la versión web para obtener configuraciones avanzadas

### En Local
1. Clona el repositorio: `git clone https://github.com/yoqer/mundo.git`
2. Abre `index.html` en tu navegador
3. La aplicación detectará el entorno automáticamente

### Versión Web Completa
Visita: https://maxxine.net/html/editor-mundos/

## 🎤 Comandos de Voz

- **"Ir a editor"** - Abrir el editor de mundos
- **"Ir a mundos"** - Ver mundos guardados  
- **"Guardar mundo"** - Guardar trabajo actual
- **"Nuevo mundo"** - Crear nuevo mundo
- **"Configuración"** - Abrir configuración
- **"Sincronizar"** - Sincronizar con la nube
- **"Modo oscuro"** - Cambiar tema visual

### ⌨️ Atajos de Teclado

- `Ctrl+S` - Guardar mundo
- `Ctrl+N` - Nuevo mundo  
- `Ctrl+O` - Abrir mundo
- `Ctrl+Z` - Deshacer
- `Ctrl+Shift+Z` - Rehacer
- `Ctrl+Shift+V` - Activar/desactivar voz
- `Escape` - Detener reconocimiento de voz

## 🔧 Arquitectura Híbrida

El sistema detecta automáticamente el entorno de ejecución:

- **Codespaces/GitHub**: Se conecta a la versión web para obtener configuraciones
- **Local**: Intenta conectar con la web, si no funciona en modo offline
- **Web**: Funcionalidad completa con todas las APIs

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Canvas**: HTML5 Canvas para edición visual
- **Voz**: Web Speech API para reconocimiento y síntesis
- **Almacenamiento**: IndexedDB, LocalStorage
- **PWA**: Service Workers, Web App Manifest
- **Responsive**: CSS Grid, Flexbox

## 🔒 Seguridad

- Las claves API se mantienen en la versión web
- La versión GitHub no contiene información sensible
- Configuración híbrida para máxima seguridad

## 📱 Progressive Web App

La aplicación es instalable como PWA con:
- Funcionamiento offline
- Iconos adaptativos
- Atajos de aplicación
- Pantalla de inicio personalizada

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT - Carlo Maxxine 

## 🆕 Changelog v6.6

- ✅ Sistema híbrido mejorado
- ✅ Mejor detección de entornos
- ✅ Optimización para GitHub Codespaces
- ✅ URLs de recuperación actualizadas
- ✅ Seguridad mejorada (claves API remotas)
- ✅ Interfaz de usuario refinada
- ✅ Mejor manejo de errores de conectividad

---

**Versión**: 6.6  
**Autor**: Maxxine Systems  
**Fecha**: Septiembre 2025

