#!/usr/bin/env python3
"""
Hybrid Screen Awareness Tracker for DAWRV
- Stable mouse tracking (Python)
- Control detection via AppleScript (more reliable)
"""

import sys
import json
import time
import threading
import subprocess
from AppKit import NSEvent, NSScreen
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID

class ScreenAwarenessTracker:
    def __init__(self):
        self.running = False
        self.last_element = None
        self.hover_delay = 0.5
        self.check_interval = 0.1
        self.last_mouse_pos = (0, 0)
        self.hover_timer = None
        
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
            self.log_error(f"Error getting mouse position: {e}")
            return None
    
    def is_reaper_window(self, x, y):
        """Check if position is over REAPER window"""
        try:
            window_list = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID
            )
            
            for window in window_list:
                owner_name = window.get('kCGWindowOwnerName', '')
                if 'REAPER' in owner_name:
                    bounds = window.get('kCGWindowBounds', {})
                    wx = bounds.get('X', 0)
                    wy = bounds.get('Y', 0)
                    ww = bounds.get('Width', 0)
                    wh = bounds.get('Height', 0)
                    
                    if wx <= x <= wx + ww and wy <= y <= wy + wh:
                        return True
            return False
        except Exception as e:
            return False
    
    def get_element_via_applescript(self, x, y):
        """Use AppleScript to query UI element at position"""
        try:
            # AppleScript to get element info
            script = f'''
                tell application "System Events"
                    tell process "REAPER"
                        try
                            set uiElem to UI element at {{{x}, {y}}}
                            set elemRole to role of uiElem
                            set elemDesc to ""
                            set elemValue to ""
                            set elemTitle to ""
                            
                            try
                                set elemDesc to description of uiElem
                            end try
                            
                            try
                                set elemValue to value of uiElem
                            end try
                            
                            try
                                set elemTitle to title of uiElem
                            end try
                            
                            return elemRole & "|" & elemTitle & "|" & elemValue & "|" & elemDesc
                        on error errMsg
                            return "error|" & errMsg
                        end try
                    end tell
                end tell
            '''
            
            # Run AppleScript
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=0.2
            )
            
            if result.returncode == 0 and result.stdout:
                output = result.stdout.strip()
                if output and not output.startswith('error|'):
                    return self.parse_applescript_output(output, x, y)
            
            return None
            
        except subprocess.TimeoutExpired:
            return None
        except Exception as e:
            return None
    
    def parse_applescript_output(self, output, x, y):
        """Parse AppleScript output into element info"""
        try:
            parts = output.split('|')
            if len(parts) < 4:
                return None
            
            role, title, value, desc = parts[0], parts[1], parts[2], parts[3]
            
            # Create element info
            element = {
                'role': role,
                'title': title if title else None,
                'value': value if value else None,
                'description': desc if desc else None,
                'position': {'x': x, 'y': y}
            }
            
            # Identify control type from role
            element['type'] = self.identify_control_type(element)
            
            return element
            
        except Exception as e:
            return None
    
    def identify_control_type(self, element):
        """Identify what type of control this is"""
        role = (element.get('role') or '').lower()
        title = (element.get('title') or '').lower()
        desc = (element.get('description') or '').lower()
        
        # Map AppleScript roles to friendly types
        if 'slider' in role or 'value indicator' in role:
            # Determine if it's a fader, pan, or other slider
            if 'volume' in title or 'fader' in title or 'db' in desc:
                return 'volume-fader'
            elif 'pan' in title or 'pan' in desc:
                return 'pan-control'
            else:
                return 'slider'
        
        elif 'button' in role or 'checkbox' in role:
            if 'mute' in title or 'mute' in desc:
                return 'mute-button'
            elif 'solo' in title or 'solo' in desc:
                return 'solo-button'
            elif 'arm' in title or 'record' in title or 'arm' in desc:
                return 'arm-button'
            elif 'fx' in title or 'effect' in title:
                return 'fx-button'
            else:
                return 'button'
        
        elif 'text' in role:
            if 'track' in desc or 'track' in title:
                return 'track-name'
            return 'text-field'
        
        elif 'menu' in role:
            return 'menu'
        
        elif 'group' in role:
            return 'group'
        
        return role if role else 'unknown'
    
    def on_hover_timeout(self, x, y):
        """Called when mouse has hovered for specified delay"""
        if not self.running:
            return
        
        current_pos = self.get_mouse_position()
        if not current_pos or current_pos != (x, y):
            return
        
        if not self.is_reaper_window(x, y):
            return
        
        # Get element via AppleScript
        element = self.get_element_via_applescript(x, y)
        
        if element:
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
            self.log_error(f"Error sending element: {e}")
    
    def log_error(self, message):
        """Log error message"""
        try:
            output = {
                'event': 'error',
                'message': message
            }
            print(json.dumps(output), flush=True)
        except:
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
        self.log_info("Hybrid screen awareness tracking started (AppleScript detection)")
        
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
                self.log_error(f"Error in track loop: {e}")
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
    
    tracker = ScreenAwarenessTracker()
    
    try:
        tracker.start(hover_delay)
    except KeyboardInterrupt:
        tracker.stop()
    except Exception as e:
        tracker.log_error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()




