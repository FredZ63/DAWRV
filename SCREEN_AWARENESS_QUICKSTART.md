# 🖱️ Screen Awareness - Quick Start Guide

## ✅ What's Been Built (DONE)

### **Core System**
- ✅ Mouse tracking (global cursor position)
- ✅ macOS Accessibility API integration
- ✅ REAPER UI element detector
- ✅ Context manager (tracks clicked/hovered controls)
- ✅ Auto-announce on hover with debounce
- ✅ IPC bridge (main ↔ renderer)
- ✅ Settings persistence (localStorage)
- ✅ Event system (element-detected, control-activated)

### **Files Created**
- ✅ `src/main/screen-awareness.js` - Core tracking system
- ✅ `src/main/context-manager.js` - Context & state management
- ✅ `src/renderer/scripts/screen-awareness-ui.js` - UI integration
- ✅ Updated `src/main/main.js` - IPC handlers
- ✅ Updated `src/main/preload.js` - API bridge

---

## 🚧 To Complete Integration (TODO)

### **Step 1: Initialize Screen Awareness in RHEA** (5 minutes)

**File:** `src/renderer/scripts/rhea.js`

**Add to constructor (after line 2):**
```javascript
constructor() {
    this.status = 'ready';
    this.isListening = false;
    // ... existing code ...
    
    // Initialize Screen Awareness UI
    this.screenAwareness = null;
    this.initScreenAwareness();
}
```

**Add new method:**
```javascript
/**
 * Initialize Screen Awareness
 */
async initScreenAwareness() {
    try {
        // Load screen-awareness-ui.js if not already loaded
        if (typeof ScreenAwarenessUI === 'undefined') {
            const script = document.createElement('script');
            script.src = './scripts/screen-awareness-ui.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }
        
        this.screenAwareness = new ScreenAwarenessUI(this);
        console.log('✅ Screen Awareness initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Screen Awareness:', error);
    }
}
```

---

### **Step 2: Add Context-Aware Commands** (10 minutes)

**File:** `src/renderer/scripts/rhea.js`

**Add to `processCommand()` function (before executing commands):**

```javascript
// Check if command contains context keywords
const contextKeywords = ['this', 'that', 'here', 'current'];
const hasContext = contextKeywords.some(kw => normalizedCommand.includes(kw));

if (hasContext && this.screenAwareness) {
    // Get active control
    const controlResult = await window.api.screenAwarenessGetActiveControl();
    
    if (controlResult.success && controlResult.control) {
        const control = controlResult.control;
        const track = this.extractTrackFromControl(control);
        
        // Replace "this/that" with actual track/control reference
        if (track) {
            transcript = transcript.replace(/\b(this|that|here|current)\b/gi, `track ${track}`);
            console.log('🎯 Context-aware command transformed:', transcript);
        }
    }
}
```

**Add helper method:**
```javascript
/**
 * Extract track number from control
 */
extractTrackFromControl(control) {
    if (!control) return null;
    
    const text = `${control.title || ''} ${control.description || ''}`;
    const match = text.match(/track\s+(\d+)/i);
    
    return match ? parseInt(match[1], 10) : null;
}
```

---

### **Step 3: Add Settings UI** (15 minutes)

**File:** `src/renderer/scripts/tts-config.js`

**Add to modal HTML (after Voice Feedback section):**

```html
<!-- Screen Awareness Section -->
<div class="settings-section">
    <h3 style="display: flex; align-items: center; gap: 8px;">
        <span>🖱️</span>
        <span>Screen Awareness</span>
    </h3>
    <p style="font-size: 0.9em; color: #888; margin-bottom: 16px;">
        RHEA can "see" what you're pointing at in REAPER and announce it!
    </p>
    
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="screenAwarenessEnabled" style="width: auto;">
        <span>Enable Screen Awareness</span>
    </label>
    
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="screenAwarenessAutoAnnounce" style="width: auto;">
        <span>Auto-announce on hover</span>
    </label>
    
    <label style="display: block; margin-bottom: 12px;">
        <span style="display: block; margin-bottom: 4px;">Hover Delay:</span>
        <select id="screenAwarenessHoverDelay" style="width: 100%; padding: 8px;">
            <option value="300">Fast (300ms)</option>
            <option value="500" selected>Normal (500ms)</option>
            <option value="1000">Slow (1000ms)</option>
            <option value="1500">Very Slow (1500ms)</option>
        </select>
    </label>
    
    <p style="font-size: 0.85em; color: #666; margin-top: 12px;">
        ℹ️ Requires macOS Accessibility permission (one-time setup)
    </p>
</div>
```

**Add to `populateForm()` method:**
```javascript
// Screen Awareness settings
const screenAwarenessSettings = JSON.parse(localStorage.getItem('screenAwarenessSettings') || '{}');
const enabledCheckbox = document.getElementById('screenAwarenessEnabled');
const autoAnnounceCheckbox = document.getElementById('screenAwarenessAutoAnnounce');
const hoverDelaySelect = document.getElementById('screenAwarenessHoverDelay');

if (enabledCheckbox) enabledCheckbox.checked = screenAwarenessSettings.enabled || false;
if (autoAnnounceCheckbox) autoAnnounceCheckbox.checked = screenAwarenessSettings.autoAnnounce !== false;
if (hoverDelaySelect) hoverDelaySelect.value = screenAwarenessSettings.hoverDelay || 500;
```

**Add event listeners in `showModal()` method:**
```javascript
// Screen Awareness event listeners
const enabledCheckbox = document.getElementById('screenAwarenessEnabled');
const autoAnnounceCheckbox = document.getElementById('screenAwarenessAutoAnnounce');
const hoverDelaySelect = document.getElementById('screenAwarenessHoverDelay');

if (enabledCheckbox) {
    enabledCheckbox.addEventListener('change', (e) => {
        if (window.rhea && window.rhea.screenAwareness) {
            window.rhea.screenAwareness.setEnabled(e.target.checked);
        }
    });
}

if (autoAnnounceCheckbox) {
    autoAnnounceCheckbox.addEventListener('change', (e) => {
        if (window.rhea && window.rhea.screenAwareness) {
            window.rhea.screenAwareness.setAutoAnnounce(e.target.checked);
        }
    });
}

if (hoverDelaySelect) {
    hoverDelaySelect.addEventListener('change', (e) => {
        if (window.rhea && window.rhea.screenAwareness) {
            window.rhea.screenAwareness.setHoverDelay(parseInt(e.target.value, 10));
        }
    });
}
```

---

### **Step 4: Load Screen Awareness Script** (2 minutes)

**File:** `src/renderer/index.html`

**Add before closing `</body>` tag:**
```html
<script src="./scripts/screen-awareness-ui.js"></script>
```

---

## 🧪 Testing Steps

1. **Restart DAWRV**
2. **Open Voice Settings** → Screen Awareness section
3. **Enable Screen Awareness** → System will prompt for Accessibility permission
4. **Grant permission** in System Settings
5. **Restart DAWRV** again
6. **Open REAPER mixer**
7. **Hover over a fader** → RHEA should announce it! 🎉
8. **Click a fader** → RHEA says "selected"
9. **Say "bring this up 5 dB"** → Fader adjusts!

---

## 🎯 Done! DAWRV is now REVOLUTIONARY! 👑

**What you've built:**
- ✅ Mouse + screen awareness
- ✅ Context-aware voice commands  
- ✅ Accessibility game-changer
- ✅ First AI DAW assistant that can "see"

**RHEA is now the QUEEN of DAW control!** 👸✨




