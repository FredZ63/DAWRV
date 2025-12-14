#!/usr/bin/env python3
"""
REAPER Bridge - Execute REAPER actions via HTTP API, OSC, or script execution
"""
import subprocess
import sys
import os
import struct

def build_osc_message(path, args):
    """Build a properly formatted OSC message"""
    # OSC path: null-padded to 4-byte boundary
    message = path.encode('utf-8') + b'\x00' * (4 - (len(path) % 4))
    
    if args:
        # Type tag: comma + types + null-padded to 4-byte boundary
        type_tag = ',' + ''.join('i' if isinstance(a, int) else 'f' if isinstance(a, float) else 's' for a in args)
        message += type_tag.encode('utf-8') + b'\x00' * (4 - (len(type_tag) % 4))
        
        # Arguments
        for arg in args:
            if isinstance(arg, int):
                message += struct.pack('>i', arg)  # Big-endian 32-bit integer
            elif isinstance(arg, float):
                message += struct.pack('>f', arg)  # Big-endian 32-bit float
            elif isinstance(arg, str):
                arg_bytes = arg.encode('utf-8')
                message += arg_bytes + b'\x00' * (4 - (len(arg_bytes) % 4))
    else:
        # No arguments - just null-padded type tag
        message += b',\x00\x00\x00'
    
    return message

def execute_reaper_action(action_id):
    """Execute a REAPER action by ID using multiple methods"""
    # Method 1: Try OSC FIRST (Open Sound Control) - FASTEST and most reliable!
    try:
        import socket
        
        # NO DELAYS - Send OSC immediately for instant execution!
        # Format 1: /action/{id} with no arguments (most reliable format)
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            message = build_osc_message(f"/action/{action_id}", [])
            sock.sendto(message, ('127.0.0.1', 8000))
            sock.close()
            print(f"✅ REAPER action {action_id} sent via OSC (instant execution)", file=sys.stderr)
            return True  # Success!
        except Exception as e:
            print(f"⚠️  OSC format 1 failed: {e}", file=sys.stderr)
            pass
        
        # Format 2: /action/{id} with integer argument
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            message = build_osc_message(f"/action/{action_id}", [int(action_id)])
            sock.sendto(message, ('127.0.0.1', 8000))
            sock.close()
            print(f"✅ REAPER action {action_id} sent via OSC (format: /action/{action_id} with arg)", file=sys.stderr)
            return True
        except:
            pass
        
        # Format 3: /action with integer argument
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            message = build_osc_message("/action", [int(action_id)])
            sock.sendto(message, ('127.0.0.1', 8000))
            sock.close()
            print(f"✅ REAPER action {action_id} sent via OSC (format: /action with arg)", file=sys.stderr)
            return True
        except:
            pass
            
    except Exception as e:
        print(f"⚠️  OSC failed: {e}", file=sys.stderr)
        pass
    
    # Method 2: Try HTTP API as fallback (no delays)
    try:
        import urllib.request
        
        url = f"http://localhost:8080/_/ACTION/{action_id}"
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=2)  # Fast timeout
        
        if response.status == 200:
            response.read()  # Read response to complete request
            print(f"✅ REAPER action {action_id} sent via HTTP API", file=sys.stderr)
            return True
    except Exception as e:
        print(f"⚠️  HTTP API failed: {e}", file=sys.stderr)
        pass
    
    # Method 3: Last resort - Use temporary Lua script file (slowest, but most compatible)
    import tempfile
    temp_dir = tempfile.gettempdir()
    temp_script = os.path.join(temp_dir, f"rhea_action_{action_id}_{os.getpid()}.lua")
    
    try:
        # Ensure temp directory exists
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir, exist_ok=True)
        
        # Write the Lua script
        with open(temp_script, 'w') as f:
            f.write(f"reaper.Main_OnCommand({action_id}, 0)\n")
        
        # Verify file was created
        if not os.path.exists(temp_script):
            print(f"❌ Failed to create temp script: {temp_script}", file=sys.stderr)
            raise FileNotFoundError(f"Temp script not created: {temp_script}")
        
        # Activate REAPER first
        try:
            subprocess.run(['osascript', '-e', 'tell application "REAPER" to activate'], 
                          timeout=1, capture_output=True)
        except:
            pass  # Ignore osascript errors
        
        # Execute via REAPER command line - use -run to execute script
        reaper_path = '/Applications/REAPER.app/Contents/MacOS/reaper'
        if not os.path.exists(reaper_path):
            print(f"❌ REAPER not found at: {reaper_path}", file=sys.stderr)
            raise FileNotFoundError(f"REAPER not found: {reaper_path}")
        
        # Use -run flag to execute the script
        result = subprocess.run(
            [reaper_path, '-nonewinst', '-run', temp_script],
            timeout=3,
            capture_output=True,
            text=True
        )
        
        # Clean up temp script immediately
        try:
            if os.path.exists(temp_script):
                os.remove(temp_script)
        except:
            pass
        
        # Check result - but note this method may report success even when it doesn't work
        if result.returncode == 0 or result.returncode is None:
            print(f"⚠️  REAPER action {action_id} attempted via temp script (may not work when REAPER is running)", file=sys.stderr)
            # Don't return True here - let it fall through to return False
        else:
            print(f"⚠️  REAPER script execution returned code {result.returncode}", file=sys.stderr)
            if result.stderr:
                print(f"   stderr: {result.stderr[:200]}", file=sys.stderr)
    except FileNotFoundError as e:
        print(f"❌ File not found error: {e}", file=sys.stderr)
        # Clean up on error
        try:
            if os.path.exists(temp_script):
                os.remove(temp_script)
        except:
            pass
    except subprocess.TimeoutExpired:
        # Clean up on timeout
        try:
            if os.path.exists(temp_script):
                os.remove(temp_script)
        except:
            pass
        print(f"⚠️  REAPER script timed out (may not work when REAPER is running)", file=sys.stderr)
    except Exception as e:
        # Clean up on any error
        try:
            if os.path.exists(temp_script):
                os.remove(temp_script)
        except:
            pass
        print(f"⚠️  Temp script method failed: {e}", file=sys.stderr)
    
    # All methods failed
    print(f"❌ All methods failed to execute REAPER action {action_id}", file=sys.stderr)
    return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        action_id = sys.argv[1]
        success = execute_reaper_action(action_id)
        sys.exit(0 if success else 1)
