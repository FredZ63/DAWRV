#!/usr/bin/env python3
"""
Simplified Screen Awareness Tracker for DAWRV
Uses macOS Accessibility API via ctypes for better compatibility
"""

import sys
import json
import time
import threading
import ctypes
import ctypes.util
from AppKit import NSEvent, NSScreen
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID

# Load ApplicationServices framework
appservices_path = ctypes.util.find_library('ApplicationServices')
appservices = ctypes.cdll.LoadLibrary(appservices_path)

# Define AX constants
kAXErrorSuccess = 0
kAXRoleAttribute = "AXRole"
kAXTitleAttribute = "AXTitle"
kAXValueAttribute = "AXValue"
kAXDescriptionAttribute = "AXDescription"

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
    
    def get_element_at_position(self, x, y):
        """
        Simplified element detection
        Since the full Accessibility API is having import issues,
        we'll use a simpler approach that detects REAPER windows
        and provides basic feedback
        """
        try:
            if not self.is_reaper_window(x, y):
                return None
            
            # For now, return a generic REAPER element
            # This will at least prove the system is working
            return {
                'role': 'AXWindow',
                'title': 'REAPER Control',
                'value': None,
                'description': f'UI element at {x}, {y}',
                'position': {'x': x, 'y': y}
            }
        except Exception as e:
            self.log_error(f"Error detecting element: {e}")
            return None
    
    def on_hover_timeout(self, x, y):
        """Called when mouse has hovered for specified delay"""
        if not self.running:
            return
        
        current_pos = self.get_mouse_position()
        if not current_pos or current_pos != (x, y):
            return
        
        if not self.is_reaper_window(x, y):
            return
        
        element = self.get_element_at_position(x, y)
        
        if element and element != self.last_element:
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
        self.log_info("Screen awareness tracking started")
        
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




