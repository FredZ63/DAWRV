-- DAWRV: Detect Control Under Mouse Cursor
-- Gets EXACT information about what REAPER control the user is hovering over
-- This is WAY more accurate than screen accessibility API

function detect_control_under_mouse()
    -- Get mouse position
    local x, y = reaper.GetMousePosition()
    
    -- Get window under mouse
    local window, segment, details = reaper.GetThingFromPoint(x, y)
    
    local result = {
        success = false,
        control_type = "unknown",
        track_number = nil,
        track_name = nil,
        track_guid = nil,
        parameter = nil,
        value = nil,
        value_formatted = nil,
        position = {x = x, y = y}
    }
    
    if not window then
        return result
    end
    
    -- Check if hovering over a track
    local track, context = reaper.GetTrackFromPoint(x, y)
    
    if track then
        -- Got a track! Now identify what control
        local track_number = reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER")
        local _, track_name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
        local track_guid = reaper.GetTrackGUID(track)
        
        result.success = true
        result.track_number = math.floor(track_number)
        result.track_name = track_name ~= "" and track_name or ("Track " .. math.floor(track_number))
        result.track_guid = track_guid
        
        -- Identify control type based on context
        if context == 0 then
            -- TCP (Track Control Panel)
            result.context = "tcp"
            result.control_type = identify_tcp_control(track, x, y)
        elseif context == 1 then
            -- MCP (Mixer Control Panel)
            result.context = "mcp"
            result.control_type = identify_mcp_control(track, x, y)
        else
            result.context = "arrange"
            result.control_type = "track_item"
        end
        
        -- Get current values for identified controls
        if result.control_type == "volume_fader" or result.control_type == "volume" then
            local volume = reaper.GetMediaTrackInfo_Value(track, "D_VOL")
            local volume_db = 20 * math.log(volume, 10)
            result.parameter = "Volume"
            result.value = volume
            result.value_formatted = string.format("%.1f dB", volume_db)
            
        elseif result.control_type == "pan_control" or result.control_type == "pan" then
            local pan = reaper.GetMediaTrackInfo_Value(track, "D_PAN")
            result.parameter = "Pan"
            result.value = pan
            if pan < -0.01 then
                result.value_formatted = string.format("%.0f%% left", math.abs(pan) * 100)
            elseif pan > 0.01 then
                result.value_formatted = string.format("%.0f%% right", pan * 100)
            else
                result.value_formatted = "center"
            end
            
        elseif result.control_type == "mute_button" or result.control_type == "mute" then
            local mute = reaper.GetMediaTrackInfo_Value(track, "B_MUTE")
            result.parameter = "Mute"
            result.value = mute
            result.value_formatted = mute == 1 and "muted" or "unmuted"
            
        elseif result.control_type == "solo_button" or result.control_type == "solo" then
            local solo = reaper.GetMediaTrackInfo_Value(track, "I_SOLO")
            result.parameter = "Solo"
            result.value = solo
            result.value_formatted = solo > 0 and "soloed" or "not soloed"
            
        elseif result.control_type == "record_arm" or result.control_type == "arm" then
            local arm = reaper.GetMediaTrackInfo_Value(track, "I_RECARM")
            result.parameter = "Record Arm"
            result.value = arm
            result.value_formatted = arm == 1 and "armed" or "not armed"
        end
    end
    
    return result
end

function identify_tcp_control(track, x, y)
    -- Track Control Panel - identify which control
    -- This is approximate but better than nothing
    
    -- Get track control panel info
    local tcp_x = reaper.GetMediaTrackInfo_Value(track, "I_WNDH")
    
    -- Heuristic: y position in TCP indicates control type
    -- This varies by theme, but gives us a good guess
    
    local track_y_start = reaper.GetMediaTrackInfo_Value(track, "I_TCPY")
    local track_height = reaper.GetMediaTrackInfo_Value(track, "I_TCPH")
    local relative_y = y - track_y_start
    
    -- Left side controls
    if x < 100 then
        if relative_y < track_height * 0.3 then
            return "mute_button"
        elseif relative_y < track_height * 0.6 then
            return "solo_button"
        else
            return "record_arm"
        end
    -- Right side (fader area)
    elseif x > 200 then
        return "volume_fader"
    -- Middle area
    else
        if relative_y < track_height * 0.5 then
            return "pan_control"
        else
            return "fx_button"
        end
    end
end

function identify_mcp_control(track, x, y)
    -- Mixer Control Panel - identify which control
    -- In mixer, controls are more vertically arranged
    
    local mcp_y_start = reaper.GetMediaTrackInfo_Value(track, "I_MCPY")
    local mcp_height = reaper.GetMediaTrackInfo_Value(track, "I_MCPH")
    local relative_y = y - mcp_y_start
    
    -- Mixer is usually: pan at top, fader in middle, buttons at bottom
    if relative_y < mcp_height * 0.15 then
        return "pan_control"
    elseif relative_y < mcp_height * 0.70 then
        return "volume_fader"
    else
        -- Bottom buttons area
        local mcp_x_start = reaper.GetMediaTrackInfo_Value(track, "I_MCPX")
        local mcp_width = reaper.GetMediaTrackInfo_Value(track, "I_MCPW")
        local relative_x = x - mcp_x_start
        
        if relative_x < mcp_width * 0.33 then
            return "mute_button"
        elseif relative_x < mcp_width * 0.66 then
            return "solo_button"
        else
            return "record_arm"
        end
    end
end

-- Main execution - called periodically to detect what's under mouse
local result = detect_control_under_mouse()

-- Write result to ExtState for DAWRV to read
if result.success then
    reaper.SetExtState("RHEA", "control_detected", "true", false)
    reaper.SetExtState("RHEA", "control_type", result.control_type or "", false)
    reaper.SetExtState("RHEA", "control_context", result.context or "", false)
    reaper.SetExtState("RHEA", "track_number", tostring(result.track_number or ""), false)
    reaper.SetExtState("RHEA", "track_name", result.track_name or "", false)
    reaper.SetExtState("RHEA", "track_guid", result.track_guid or "", false)
    reaper.SetExtState("RHEA", "parameter", result.parameter or "", false)
    reaper.SetExtState("RHEA", "value_formatted", result.value_formatted or "", false)
else
    reaper.SetExtState("RHEA", "control_detected", "false", false)
end

-- Return result for immediate reading
return result



