#!/usr/bin/env python3
"""
Smart Screen Awareness Tracker for DAWRV
Uses window position analysis to identify likely control types
More reliable than AppleScript, works with any REAPER layout
"""

import sys
import json
import time
import threading
from AppKit import NSEvent, NSScreen
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID

class SmartScreenAwarenessTracker:
    def __init__(self):
        self.running = False
        self.last_element = None
        self.hover_delay = 0.5
        self.check_interval = 0.1
        self.last_mouse_pos = (0, 0)
        self.hover_timer = None
        self.reaper_windows = {}
        
    def get_mouse_position(self):
        """Get current mouse cursor position"""
        try:
            mouse_loc = NSEvent.mouseLocation()
            screen = NSScreen.mainScreen()
            screen_frame = screen.frame()
            x = int(mouse_loc.x)
            y = int(screen_frame.size.height - mouse_loc.y)
            return (x, y)
        except Exception as e:
            return None
    
    def get_reaper_windows(self):
        """Get all REAPER window positions"""
        try:
            window_list = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID
            )
            
            reaper_windows = {}
            for window in window_list:
                owner_name = window.get('kCGWindowOwnerName', '')
                if 'REAPER' in owner_name:
                    window_name = window.get('kCGWindowName', 'Unknown')
                    bounds = window.get('kCGWindowBounds', {})
                    
                    reaper_windows[window_name] = {
                        'x': bounds.get('X', 0),
                        'y': bounds.get('Y', 0),
                        'width': bounds.get('Width', 0),
                        'height': bounds.get('Height', 0)
                    }
            
            return reaper_windows
        except Exception as e:
            return {}
    
    def identify_control_from_position(self, x, y):
        """Identify control type based on position within REAPER window"""
        windows = self.get_reaper_windows()
        
        if not windows:
            self.log_info("No REAPER windows found - check if REAPER is running")
            return None
        
        self.log_info(f"Found {len(windows)} REAPER window(s): {list(windows.keys())}")
        
        for window_name, bounds in windows.items():
            wx, wy = bounds['x'], bounds['y']
            ww, wh = bounds['width'], bounds['height']
            
            # Check if cursor is in this window
            if wx <= x <= wx + ww and wy <= y <= wy + wh:
                # Calculate relative position within window
                rel_x = x - wx
                rel_y = y - wy
                rel_x_pct = (rel_x / ww) * 100 if ww > 0 else 0
                rel_y_pct = (rel_y / wh) * 100 if wh > 0 else 0
                
                # Debug logging
                self.log_info(f"Detected window: {window_name}, pos: {rel_x_pct:.1f}%, {rel_y_pct:.1f}%")
                
                control = self.guess_control_type(window_name, rel_x_pct, rel_y_pct, rel_x, rel_y)
                
                if control:
                    self.log_info(f"Identified: {control.get('type', 'unknown')}")
                else:
                    self.log_info("No control identified - returning None")
                
                return control
        
        return None
    
    def guess_control_type(self, window_name, x_pct, y_pct, abs_x, abs_y):
        """Guess control type based on window name and position"""
        
        window_lower = window_name.lower()
        self.log_info(f"guess_control_type: window='{window_name}', x={x_pct:.1f}%, y={y_pct:.1f}%")
        
        # Mixer window detection (separate window or embedded)
        if 'mixer' in window_lower or 'mix' in window_lower:
            self.log_info("Detected MIXER window by name")
            return self.identify_mixer_control(x_pct, y_pct)
        
        # Main REAPER window - use smart detection based on position
        # Assumes mixer might be on left, track view in center/right
        # IMPORTANT: "Unknown" windows from REAPER should be treated as REAPER main window
        elif 'reaper' in window_lower or 'unknown' in window_lower:
            self.log_info(f"Detected REAPER/Unknown window, x_pct={x_pct:.1f}%")
            # If on the left half (<50%), assume mixer area
            # Adjust this threshold based on your mixer width
            if x_pct < 50:
                self.log_info("Position suggests MIXER area (left side)")
                return self.identify_mixer_control(x_pct, y_pct)
            else:
                self.log_info("Position suggests TRACK VIEW area (center/right)")
                return self.identify_track_view_control(x_pct, y_pct)
        
        # FX window detection
        elif 'fx' in window_lower or 'vst' in window_lower or 'plugin' in window_lower:
            return {
                'type': 'plugin-control',
                'role': 'Plugin Parameter',
                'title': 'Plugin Control',
                'description': 'Plugin parameter control',
                'window': window_name
            }
        
        # Generic REAPER window
        else:
            return {
                'type': 'reaper-control',
                'role': 'UI Element',
                'title': 'REAPER Control',
                'description': f'Control in {window_name}',
                'window': window_name
            }
    
    def identify_mixer_control(self, x_pct, y_pct):
        """Identify control in mixer window based on position"""
        
        # Mixer layout (typical):
        # Top: meters, buttons (0-20%)
        # Middle: faders (20-80%)
        # Bottom: pan, names, routing (80-100%)
        
        self.log_info(f"identify_mixer_control: y_pct={y_pct:.1f}%")
        
        # REAPER Mixer layout (from top to bottom, based on actual screenshot):
        # 0-8%: Plugin/FX labels (top labels)
        # 8-15%: FX INSERT/AUTO buttons
        # 15-25%: PAN KNOBS (round controls)
        # 25-30%: Small routing buttons
        # 30-85%: FADERS (the long vertical sliders - MAIN AREA!)
        # 85-93%: MUTE/SOLO buttons (green/red lit buttons)
        # 93-100%: Bottom meters and labels
        
        if y_pct < 8:
            # Top labels (FX names, plugin names)
            self.log_info("Zone: FX LABELS (top)")
            return {
                'type': 'fx-button',
                'role': 'Button',
                'title': 'FX Slot',
                'description': 'Plugin/FX slot'
            }
        
        elif 8 <= y_pct < 15:
            # FX INSERT/AUTO buttons
            self.log_info("Zone: FX BUTTONS")
            return {
                'type': 'fx-button',
                'role': 'Button',
                'title': 'FX Button',
                'description': 'FX Insert/Auto button'
            }
        
        elif 15 <= y_pct < 30:
            # Pan knobs and routing area
            self.log_info("Zone: PAN KNOBS")
            return {
                'type': 'pan-control',
                'role': 'Knob',
                'title': 'Pan Control',
                'description': 'Track pan knob'
            }
        
        elif 30 <= y_pct < 85:
            # FADERS - the main vertical sliders (BIGGEST area)
            self.log_info("Zone: VOLUME FADERS")
            return {
                'type': 'volume-fader',
                'role': 'Slider',
                'title': 'Volume Fader',
                'description': 'Track volume fader'
            }
        
        elif 85 <= y_pct < 93:
            # Mute/Solo buttons (the green/red lit buttons)
            self.log_info("Zone: MUTE/SOLO BUTTONS")
            return {
                'type': 'button',
                'role': 'Button',
                'title': 'Mute/Solo',
                'description': 'Mute or Solo button'
            }
        
        else:
            # Bottom - meters, track info
            self.log_info("Zone: BOTTOM METERS")
            return {
                'type': 'track-label',
                'role': 'Text',
                'title': 'Track Info',
                'description': 'Track meter or label'
            }
    
    def identify_track_view_control(self, x_pct, y_pct):
        """Identify control in main track view"""
        
        if x_pct < 20:
            # Left side - track controls
            if y_pct % 10 < 3:
                return {
                    'type': 'arm-button',
                    'role': 'Button',
                    'title': 'Record Arm',
                    'description': 'Track record arm button'
                }
            elif y_pct % 10 < 6:
                return {
                    'type': 'mute-button',
                    'role': 'Button',
                    'title': 'Mute',
                    'description': 'Track mute button'
                }
            else:
                return {
                    'type': 'solo-button',
                    'role': 'Button',
                    'title': 'Solo',
                    'description': 'Track solo button'
                }
        
        elif x_pct < 40:
            # Track name area
            return {
                'type': 'track-name',
                'role': 'Text',
                'title': 'Track Name',
                'description': 'Track name field'
            }
        
        elif x_pct < 60:
            # FX area
            return {
                'type': 'fx-button',
                'role': 'Button',
                'title': 'FX',
                'description': 'Track FX chain'
            }
        
        else:
            # Timeline/envelope area
            return {
                'type': 'timeline',
                'role': 'Timeline',
                'title': 'Track Timeline',
                'description': 'Track timeline and items'
            }
    
    def on_hover_timeout(self, x, y):
        """Called when mouse has hovered for specified delay"""
        if not self.running:
            return
        
        current_pos = self.get_mouse_position()
        if not current_pos or current_pos != (x, y):
            return
        
        element = self.identify_control_from_position(x, y)
        
        if element:
            element['position'] = {'x': x, 'y': y}
            
            # Create element key for comparison
            element_key = f"{element.get('type', '')}_{element.get('title', '')}_{x}_{y}"
            last_key = None
            
            if self.last_element:
                last_key = f"{self.last_element.get('type', '')}_{self.last_element.get('title', '')}_{self.last_element.get('position', {}).get('x', '')}_{self.last_element.get('position', {}).get('y', '')}"
            
            if element_key != last_key:
                self.last_element = element
                self.send_element_detected(element)
    
    def send_element_detected(self, element):
        """Send element detection event to DAWRV"""
        try:
            output = {
                'event': 'element-detected',
                'element': element
            }
            print(json.dumps(output), flush=True)
        except Exception as e:
            pass
    
    def log_info(self, message):
        """Log info message"""
        try:
            output = {
                'event': 'info',
                'message': message
            }
            print(json.dumps(output), flush=True)
        except:
            pass
    
    def track_loop(self):
        """Main tracking loop"""
        self.log_info("Smart screen awareness tracking started (Position-based detection)")
        
        while self.running:
            try:
                pos = self.get_mouse_position()
                
                if pos and pos != self.last_mouse_pos:
                    if self.hover_timer:
                        self.hover_timer.cancel()
                    
                    self.last_mouse_pos = pos
                    x, y = pos
                    
                    self.hover_timer = threading.Timer(
                        self.hover_delay,
                        self.on_hover_timeout,
                        args=(x, y)
                    )
                    self.hover_timer.daemon = True
                    self.hover_timer.start()
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                time.sleep(1)
        
        self.log_info("Screen awareness tracking stopped")
    
    def start(self, hover_delay=0.5):
        """Start tracking"""
        self.hover_delay = hover_delay
        self.running = True
        self.track_loop()
    
    def stop(self):
        """Stop tracking"""
        self.running = False
        if self.hover_timer:
            self.hover_timer.cancel()

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        hover_delay = float(sys.argv[1]) / 1000.0
    else:
        hover_delay = 0.5
    
    tracker = SmartScreenAwarenessTracker()
    
    try:
        tracker.start(hover_delay)
    except KeyboardInterrupt:
        tracker.stop()
    except Exception as e:
        sys.exit(1)

if __name__ == '__main__':
    main()

