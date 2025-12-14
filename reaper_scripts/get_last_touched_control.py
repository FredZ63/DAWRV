"""
REAPER Script: Get Last Touched Control Information
Returns detailed info about the last control the user touched in REAPER
"""

import sys
import json

try:
    from reaper_python import *
except ImportError:
    # Fallback for testing outside REAPER
    pass

def get_last_touched_control():
    """Get information about the last touched control in REAPER"""
    
    result = {
        'success': False,
        'control_type': None,
        'track_number': None,
        'track_name': None,
        'parameter_name': None,
        'value': None,
        'value_formatted': None
    }
    
    try:
        # Get last touched track
        track = RPR_GetLastTouchedTrack()
        
        if track:
            # Get track number (1-based)
            track_number = int(RPR_GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER"))
            result['track_number'] = track_number
            
            # Get track name
            retval, track_name = RPR_GetSetMediaTrackInfo_String(track, "P_NAME", "", False)
            result['track_name'] = track_name if track_name else f"Track {track_number}"
            
            # Check what parameter was last touched
            # Get last touched FX
            retval, track_idx, fx_idx, param_idx = RPR_GetLastTouchedFX()
            
            if retval:
                # FX parameter was touched
                result['control_type'] = 'fx-parameter'
                
                # Get FX name
                retval, fx_name = RPR_TrackFX_GetFXName(track, fx_idx, "")
                result['parameter_name'] = fx_name
                
                # Get parameter value
                param_value = RPR_TrackFX_GetParam(track, fx_idx, param_idx)
                retval, param_name = RPR_TrackFX_GetParamName(track, fx_idx, param_idx, "")
                
                result['value'] = param_value
                result['parameter_name'] = f"{fx_name}: {param_name}"
                result['value_formatted'] = f"{param_value:.2f}"
                result['success'] = True
                
            else:
                # Check common track parameters
                
                # Volume
                volume = RPR_GetMediaTrackInfo_Value(track, "D_VOL")
                if volume is not None:
                    result['control_type'] = 'volume-fader'
                    result['parameter_name'] = 'Volume'
                    result['value'] = volume
                    # Convert to dB
                    if volume > 0:
                        db_value = 20 * (volume ** 0.5)  # Approximate conversion
                        result['value_formatted'] = f"{db_value:.1f} dB"
                    else:
                        result['value_formatted'] = "-inf dB"
                    result['success'] = True
                
                # Pan
                pan = RPR_GetMediaTrackInfo_Value(track, "D_PAN")
                if pan is not None:
                    result['control_type'] = 'pan-control'
                    result['parameter_name'] = 'Pan'
                    result['value'] = pan
                    # Pan is -1 (left) to +1 (right)
                    if pan < -0.01:
                        result['value_formatted'] = f"{abs(pan * 100):.0f}% L"
                    elif pan > 0.01:
                        result['value_formatted'] = f"{pan * 100:.0f}% R"
                    else:
                        result['value_formatted'] = "Center"
                    result['success'] = True
                
                # Mute
                mute = RPR_GetMediaTrackInfo_Value(track, "B_MUTE")
                if mute is not None:
                    result['control_type'] = 'mute-button'
                    result['parameter_name'] = 'Mute'
                    result['value'] = mute
                    result['value_formatted'] = "On" if mute else "Off"
                    result['success'] = True
                
                # Solo
                solo = RPR_GetMediaTrackInfo_Value(track, "I_SOLO")
                if solo is not None:
                    result['control_type'] = 'solo-button'
                    result['parameter_name'] = 'Solo'
                    result['value'] = solo
                    result['value_formatted'] = "On" if solo else "Off"
                    result['success'] = True
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

if __name__ == "__main__":
    # Get control info
    control_info = get_last_touched_control()
    
    # Output as JSON
    print(json.dumps(control_info))




