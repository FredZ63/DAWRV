#!/usr/bin/env python3
"""
REAPER Tempo Bridge - Execute tempo/BPM commands via REAPER
"""
import subprocess
import sys
import os
import tempfile

def execute_tempo_command(command, value=None):
    """Execute a tempo command in REAPER"""
    try:
        # Path to tempo script
        home_dir = os.path.expanduser("~")
        tempo_script = os.path.join(
            home_dir,
            "Library/Application Support/REAPER/Scripts/DAWRV/dawrv_tempo.lua"
        )
        
        # Check if script exists
        if not os.path.exists(tempo_script):
            # Create temp script with tempo command
            temp_dir = tempfile.gettempdir()
            temp_script = os.path.join(temp_dir, f"dawrv_tempo_{os.getpid()}.lua")
            
            script_content = ""
            if command == "set" and value:
                script_content = f"reaper.SetCurrentBPM(0, {value}, false)\n"
            elif command == "increase" and value:
                script_content = f"local current = reaper.Master_GetTempo()\nreaper.SetCurrentBPM(0, current + {value}, false)\n"
            elif command == "decrease" and value:
                script_content = f"local current = reaper.Master_GetTempo()\nreaper.SetCurrentBPM(0, math.max(1, current - {value}), false)\n"
            elif command == "get":
                script_content = "local tempo = reaper.Master_GetTempo()\nprint(string.format(\"%.2f\", tempo))\n"
            else:
                return False
            
            with open(temp_script, 'w') as f:
                f.write(script_content)
            
            script_path = temp_script
        else:
            script_path = tempo_script
        
        # Activate REAPER
        try:
            subprocess.run(['osascript', '-e', 'tell application "REAPER" to activate'], 
                          timeout=1, capture_output=True)
        except:
            pass
        
        # Execute via REAPER
        reaper_path = '/Applications/REAPER.app/Contents/MacOS/reaper'
        if not os.path.exists(reaper_path):
            print(f"❌ REAPER not found at: {reaper_path}", file=sys.stderr)
            return False
        
        # Build command
        if command == "get":
            # For get, we need to capture output
            result = subprocess.run(
                [reaper_path, '-nonewinst', '-run', script_path],
                timeout=3,
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                tempo = result.stdout.strip()
                try:
                    tempo_float = float(tempo)
                    print(f"Current tempo: {tempo_float} BPM", file=sys.stderr)
                    return tempo_float
                except:
                    pass
        else:
            # For set/increase/decrease, just execute
            result = subprocess.run(
                [reaper_path, '-nonewinst', '-run', script_path],
                timeout=3,
                capture_output=True,
                text=True
            )
        
        # Clean up temp script if we created one
        if not os.path.exists(tempo_script) and script_path.startswith(tempfile.gettempdir()):
            try:
                os.remove(script_path)
            except:
                pass
        
        return True
    except Exception as e:
        print(f"❌ Tempo command failed: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: reaper_tempo_bridge.py <command> [value]")
        print("Commands: set, increase, decrease, get")
        sys.exit(1)
    
    command = sys.argv[1]
    value = None
    
    if len(sys.argv) > 2:
        try:
            value = float(sys.argv[2])
        except:
            print(f"Invalid value: {sys.argv[2]}", file=sys.stderr)
            sys.exit(1)
    
    result = execute_tempo_command(command, value)
    
    if command == "get" and isinstance(result, (int, float)):
        print(result)
        sys.exit(0)
    elif result:
        sys.exit(0)
    else:
        sys.exit(1)

