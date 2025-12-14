#!/usr/bin/env python3
"""
Screen Awareness Tracker for DAWRV
Uses macOS Accessibility API to detect UI elements under cursor
"""

import sys
import json
import time
import threading
from AppKit import NSEvent, NSScreen
from Quartz import (
    CGWindowListCopyWindowInfo,
    kCGWindowListOptionOnScreenOnly,
    kCGNullWindowID
)
import Quartz

# Accessibility API constants and functions
try:
    # Try direct import first
    from Quartz import (
        kAXErrorSuccess,
        kAXRoleAttribute,
        kAXTitleAttribute,
        kAXValueAttribute,
        kAXDescriptionAttribute,
        kAXPositionAttribute,
        AXUIElementCreateSystemWide,
        AXUIElementCopyAttributeValue,
        AXUIElementCopyElementAtPosition
    )
except ImportError:
    # Fallback to attribute access
    kAXErrorSuccess = 0  # Standard success code
    kAXRoleAttribute = 'AXRole'
    kAXTitleAttribute = 'AXTitle'
    kAXValueAttribute = 'AXValue'
    kAXDescriptionAttribute = 'AXDescription'
    kAXPositionAttribute = 'AXPosition'
    
    # Get functions from Quartz module
    AXUIElementCreateSystemWide = Quartz.AXUIElementCreateSystemWide
    AXUIElementCopyAttributeValue = Quartz.AXUIElementCopyAttributeValue
    AXUIElementCopyElementAtPosition = Quartz.AXUIElementCopyElementAtPosition

class ScreenAwarenessTracker:
    def __init__(self):
        self.running = False
        self.last_element = None
        self.hover_delay = 0.5  # seconds
        self.check_interval = 0.1  # seconds
        self.last_mouse_pos = (0, 0)
        self.hover_timer = None
        
    def get_mouse_position(self):
        """Get current mouse cursor position"""
        try:
            mouse_loc = NSEvent.mouseLocation()
            # Convert to screen coordinates
            screen = NSScreen.mainScreen()
            screen_frame = screen.frame()
            x = int(mouse_loc.x)
            y = int(screen_frame.size.height - mouse_loc.y)
            return (x, y)
        except Exception as e:
            self.log_error(f"Error getting mouse position: {e}")
            return None
    
    def get_element_at_position(self, x, y):
        """Get accessibility element at given position"""
        try:
            # Create system-wide accessibility object
            system_wide = AXUIElementCreateSystemWide()
            
            # Get element at position
            err, element = AXUIElementCopyElementAtPosition(system_wide, x, y, None)
            
            if err != kAXErrorSuccess or not element:
                return None
            
            # Extract element attributes
            element_info = {}
            
            # Get role
            err, role = AXUIElementCopyAttributeValue(element, kAXRoleAttribute, None)
            if err == kAXErrorSuccess:
                element_info['role'] = str(role) if role else None
            
            # Get title
            err, title = AXUIElementCopyAttributeValue(element, kAXTitleAttribute, None)
            if err == kAXErrorSuccess:
                element_info['title'] = str(title) if title else None
            
            # Get value
            err, value = AXUIElementCopyAttributeValue(element, kAXValueAttribute, None)
            if err == kAXErrorSuccess:
                element_info['value'] = str(value) if value else None
            
            # Get description
            err, desc = AXUIElementCopyAttributeValue(element, kAXDescriptionAttribute, None)
            if err == kAXErrorSuccess:
                element_info['description'] = str(desc) if desc else None
            
            # Get position
            err, pos = AXUIElementCopyAttributeValue(element, kAXPositionAttribute, None)
            if err == kAXErrorSuccess and pos:
                element_info['position'] = {'x': int(pos.x), 'y': int(pos.y)}
            else:
                element_info['position'] = {'x': x, 'y': y}
            
            return element_info
            
        except Exception as e:
            self.log_error(f"Error getting element: {e}")
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
            self.log_error(f"Error checking REAPER window: {e}")
            return False
    
    def on_hover_timeout(self, x, y):
        """Called when mouse has hovered for specified delay"""
        if not self.running:
            return
        
        # Check if still over same position
        current_pos = self.get_mouse_position()
        if not current_pos or current_pos != (x, y):
            return
        
        # Check if over REAPER
        if not self.is_reaper_window(x, y):
            return
        
        # Get element at position
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
                # Get current mouse position
                pos = self.get_mouse_position()
                
                if pos and pos != self.last_mouse_pos:
                    # Mouse moved - cancel existing timer and start new one
                    if self.hover_timer:
                        self.hover_timer.cancel()
                    
                    self.last_mouse_pos = pos
                    x, y = pos
                    
                    # Start hover timer
                    self.hover_timer = threading.Timer(
                        self.hover_delay,
                        self.on_hover_timeout,
                        args=(x, y)
                    )
                    self.hover_timer.daemon = True
                    self.hover_timer.start()
                
                # Sleep before next check
                time.sleep(self.check_interval)
                
            except Exception as e:
                self.log_error(f"Error in track loop: {e}")
                time.sleep(1)  # Back off on error
        
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
        hover_delay = float(sys.argv[1]) / 1000.0  # Convert ms to seconds
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

