-- DAWRV: Absolute Position Detector
-- Last attempt: Use ABSOLUTE screen position (ignore track dimensions)

local POLL_INTERVAL = 0.2
local last_poll_time = 0
local last_control = {}

function get_control_under_mouse()
    local x, y = reaper.GetMousePosition()
    local track, context = reaper.GetTrackFromPoint(x, y)
    
    if not track then
        return {success = false}
    end
    
    -- Get track info
    local track_number = math.floor(reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER"))
    local _, track_name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
    if track_name == "" then
        if track_number == 0 then
            track_name = "Master"
        else
            track_name = "Track " .. track_number
        end
    end
    
    local result = {
        success = true,
        track_number = track_number,
        track_name = track_name,
        control_type = "track_area",
        parameter = "Track",
        value = track_number,
        value_formatted = track_name,
        timestamp = reaper.time_precise()
    }
    
    -- Just announce the track, forget specific controls
    reaper.ShowConsoleMsg(string.format(
        "🎛️  Mouse over: %s (absolute pos: x=%d y=%d)\n",
        track_name, x, y
    ))
    
    return result
end

function write_to_extstate(result)
    if result.success then
        reaper.SetExtState("RHEA", "control_detected", "true", false)
        reaper.SetExtState("RHEA", "control_type", "track_area", false)
        reaper.SetExtState("RHEA", "track_number", tostring(result.track_number or ""), false)
        reaper.SetExtState("RHEA", "track_name", result.track_name or "", false)
        reaper.SetExtState("RHEA", "parameter", "Track", false)
        reaper.SetExtState("RHEA", "value_formatted", result.track_name or "", false)
        reaper.SetExtState("RHEA", "timestamp", tostring(result.timestamp), false)
    else
        reaper.SetExtState("RHEA", "control_detected", "false", false)
    end
end

function has_control_changed(new_control)
    if not last_control.success then
        return true
    end
    
    if new_control.track_number ~= last_control.track_number then
        return true
    end
    
    return false
end

function main()
    local current_time = reaper.time_precise()
    
    if current_time - last_poll_time >= POLL_INTERVAL then
        last_poll_time = current_time
        
        local result = get_control_under_mouse()
        
        if has_control_changed(result) then
            write_to_extstate(result)
            last_control = result
        end
    end
    
    reaper.defer(main)
end

-- Start
reaper.ShowConsoleMsg("🎛️  DAWRV Track Detector - Just announces which TRACK you're on\n")
reaper.ShowConsoleMsg("    Use voice commands like: 'Rhea, mute this track'\n\n")
main()



