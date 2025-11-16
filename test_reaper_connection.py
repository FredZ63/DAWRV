#!/usr/bin/env python3
"""
Test REAPER connection methods
"""
import subprocess
import socket
import urllib.request
import sys

def test_http_api():
    """Test REAPER HTTP API"""
    print("Testing HTTP API (port 8080)...")
    try:
        url = "http://localhost:8080/_/ACTION/1007"
        req = urllib.request.Request(url)
        urllib.request.urlopen(req, timeout=1)
        print("✅ HTTP API is working!")
        return True
    except Exception as e:
        print(f"❌ HTTP API failed: {e}")
        return False

def test_osc():
    """Test REAPER OSC"""
    print("\nTesting OSC (port 8000)...")
    try:
        import struct
        
        def build_osc_message(path, args):
            message = path.encode('utf-8') + b'\x00' * (4 - (len(path) % 4))
            if args:
                type_tag = ',' + ''.join('i' if isinstance(a, int) else 'f' if isinstance(a, float) else 's' for a in args)
                message += type_tag.encode('utf-8') + b'\x00' * (4 - (len(type_tag) % 4))
                for arg in args:
                    if isinstance(arg, int):
                        message += struct.pack('>i', arg)
                    elif isinstance(arg, float):
                        message += struct.pack('>f', arg)
                    elif isinstance(arg, str):
                        arg_bytes = arg.encode('utf-8')
                        message += arg_bytes + b'\x00' * (4 - (len(arg_bytes) % 4))
            else:
                message += b',\x00\x00\x00'
            return message
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        message = build_osc_message("/action/1007", [])
        sock.sendto(message, ('127.0.0.1', 8000))
        sock.close()
        print("✅ OSC message sent (check if REAPER responds)")
        return True
    except Exception as e:
        print(f"❌ OSC failed: {e}")
        return False

def test_command_line():
    """Test REAPER command line"""
    print("\nTesting Command Line method...")
    try:
        result = subprocess.run(
            ['/Applications/REAPER.app/Contents/MacOS/reaper', '-nonewinst', '-eval', 'reaper.Main_OnCommand(1007, 0)'],
            timeout=3,
            capture_output=True,
            text=True
        )
        print(f"Command returned: {result.stdout.strip()}")
        print(f"Exit code: {result.returncode}")
        if result.returncode == 0:
            print("✅ Command line method executed (but may not work when REAPER is already running)")
            return True
        else:
            print("⚠️  Command line method returned non-zero exit code")
            return False
    except Exception as e:
        print(f"❌ Command line failed: {e}")
        return False

def check_reaper_running():
    """Check if REAPER is running"""
    print("Checking if REAPER is running...")
    result = subprocess.run(['pgrep', '-f', 'REAPER'], capture_output=True)
    if result.returncode == 0:
        print("✅ REAPER is running")
        return True
    else:
        print("❌ REAPER is NOT running")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("REAPER Connection Diagnostic")
    print("=" * 60)
    
    reaper_running = check_reaper_running()
    print()
    
    http_works = test_http_api()
    osc_works = test_osc()
    cmd_works = test_command_line()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("=" * 60)
    
    if not reaper_running:
        print("⚠️  REAPER is not running. Please start REAPER first.")
    
    if http_works:
        print("✅ HTTP API is enabled and working - this is the best method!")
    else:
        print("❌ HTTP API is NOT enabled or not working")
        print("   → Enable it in REAPER: Preferences > Control/OSC/web > Web interface")
    
    if osc_works:
        print("✅ OSC port is open - but verify REAPER actually responds")
    else:
        print("❌ OSC is NOT enabled or not working")
        print("   → Enable it in REAPER: Preferences > Control/OSC/web > Control surface > OSC")
    
    if cmd_works:
        print("⚠️  Command line works, but may not execute when REAPER is already running")
    else:
        print("❌ Command line method failed")
    
    print("\n" + "=" * 60)
    print("RECOMMENDATION:")
    print("=" * 60)
    if http_works:
        print("✅ Use HTTP API - it's the most reliable method!")
    elif osc_works:
        print("⚠️  OSC is enabled, but verify REAPER responds to commands")
        print("   Check REAPER's OSC settings allow connections from localhost")
    else:
        print("❌ Neither HTTP API nor OSC is working")
        print("   Please enable one of them in REAPER preferences")
        print("   See REAPER_SETUP.md for detailed instructions")


