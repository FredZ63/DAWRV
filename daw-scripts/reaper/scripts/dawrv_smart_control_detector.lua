-- DAWRV: Smart Control Detector v7
-- FIXED: Manually check if mouse is in mixer bounds!

local POLL_INTERVAL = 0.1
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
        control_type = "unknown",
        parameter = nil,
        value = nil,
        value_formatted = nil,
        timestamp = reaper.time_precise()
    }
    
    -- Get mixer dimensions
    local mcp_x = reaper.GetMediaTrackInfo_Value(track, "I_MCPX")
    local mcp_y = reaper.GetMediaTrackInfo_Value(track, "I_MCPY")
    local mcp_w = reaper.GetMediaTrackInfo_Value(track, "I_MCPW")
    local mcp_h = reaper.GetMediaTrackInfo_Value(track, "I_MCPH")
    
    -- MANUAL CHECK: Is mouse actually inside mixer bounds?
    local in_mixer = false
    if mcp_w > 0 and mcp_h > 0 then
        -- Check if mouse X and Y are within mixer bounds
        if x >= mcp_x and x <= (mcp_x + mcp_w) and 
           y >= mcp_y and y <= (mcp_y + mcp_h) then
            in_mixer = true
        end
    end
    
    reaper.ShowConsoleMsg(string.format(
        "Mouse: x=%d y=%d | Mixer: x=%d y=%d w=%d h=%d | In mixer: %s\n",
        x, y, mcp_x, mcp_y, mcp_w, mcp_h, in_mixer and "YES" or "NO"
    ))
    
    if in_mixer then
        -- We're in the MIXER!
        local rel_y = y - mcp_y
        local rel_x = x - mcp_x
        local y_ratio = rel_y / mcp_h
        
        reaper.ShowConsoleMsg(string.format("  In MIXER! y=%.0f/%.0f = %.2f\n", rel_y, mcp_h, y_ratio))
        
        -- TOP 12%: Pan
        if y_ratio < 0.12 then
            reaper.ShowConsoleMsg("  → PAN\n")
            result.control_type = "pan_control"
        
        -- BOTTOM 20%: Buttons
        elseif y_ratio > 0.80 then
            reaper.ShowConsoleMsg("  → BUTTONS\n")
            local btn_w = mcp_w / 4
            
            if rel_x < btn_w then
                result.control_type = "mute_button"
            elseif rel_x < btn_w * 2 then
                result.control_type = "solo_button"
            elseif rel_x < btn_w * 3 then
                result.control_type = "record_arm"
            else
                result.control_type = "fx_button"
            end
        
        -- MIDDLE: Volume fader
        else
            reaper.ShowConsoleMsg("  → VOLUME\n")
            result.control_type = "volume_fader"
        end
    else
        -- Not in mixer, just announce track
        reaper.ShowConsoleMsg("  Not in mixer bounds\n")
        result.control_type = "track_area"
    end
    
    -- Add current values
    add_control_values(track, result)
    
    return result
end

function add_control_values(track, result)
    local control = result.control_type
    
    if control == "volume_fader" or control == "volume" then
        local vol = reaper.GetMediaTrackInfo_Value(track, "D_VOL")
        if vol and vol > 0 then
            local vol_db = 20 * math.log(vol, 10)
            result.parameter = "Volume"
            result.value = vol
            result.value_formatted = string.format("%.1f dB", vol_db)
        end
        
    elseif control == "pan_control" or control == "pan" then
        local pan = reaper.GetMediaTrackInfo_Value(track, "D_PAN")
        result.parameter = "Pan"
        result.value = pan
        if pan < -0.01 then
            result.value_formatted = string.format("%d%% left", math.floor(math.abs(pan) * 100 + 0.5))
        elseif pan > 0.01 then
            result.value_formatted = string.format("%d%% right", math.floor(pan * 100 + 0.5))
        else
            result.value_formatted = "center"
        end
        
    elseif control == "mute_button" or control == "mute" then
        local mute = reaper.GetMediaTrackInfo_Value(track, "B_MUTE")
        result.parameter = "Mute"
        result.value = mute
        result.value_formatted = mute == 1 and "muted" or "unmuted"
        
    elseif control == "solo_button" or control == "solo" then
        local solo = reaper.GetMediaTrackInfo_Value(track, "I_SOLO")
        result.parameter = "Solo"
        result.value = solo
        result.value_formatted = solo > 0 and "soloed" or "not soloed"
        
    elseif control == "record_arm" or control == "arm" then
        local arm = reaper.GetMediaTrackInfo_Value(track, "I_RECARM")
        result.parameter = "Record Arm"
        result.value = arm
        result.value_formatted = arm == 1 and "armed" or "not armed"
        
    elseif control == "fx_button" or control == "fx" then
        local fx_count = reaper.TrackFX_GetCount(track)
        result.parameter = "FX"
        result.value = fx_count
        result.value_formatted = fx_count > 0 and (fx_count .. " FX") or "no FX"
    end
end

function has_control_changed(new_control)
    if not last_control.success then
        return true
    end
    
    if new_control.success ~= last_control.success then
        return true
    end
    
    if new_control.track_number ~= last_control.track_number then
        return true
    end
    
    if new_control.control_type ~= last_control.control_type then
        return true
    end
    
    if new_control.value and last_control.value then
        if math.abs(new_control.value - last_control.value) > 0.01 then
            return true
        end
    end
    
    return false
end

function write_to_extstate(result)
    if result.success then
        reaper.SetExtState("RHEA", "control_detected", "true", false)
        reaper.SetExtState("RHEA", "control_type", result.control_type or "", false)
        reaper.SetExtState("RHEA", "track_number", tostring(result.track_number or ""), false)
        reaper.SetExtState("RHEA", "track_name", result.track_name or "", false)
        reaper.SetExtState("RHEA", "parameter", result.parameter or "", false)
        reaper.SetExtState("RHEA", "value_formatted", result.value_formatted or "", false)
        reaper.SetExtState("RHEA", "timestamp", tostring(result.timestamp), false)
    else
        reaper.SetExtState("RHEA", "control_detected", "false", false)
    end
end

function main()
    local current_time = reaper.time_precise()
    
    if current_time - last_poll_time >= POLL_INTERVAL then
        last_poll_time = current_time
        
        local result = get_control_under_mouse()
        
        if has_control_changed(result) then
            write_to_extstate(result)
            last_control = result
            
            if result.success then
                reaper.ShowConsoleMsg(string.format(
                    "✅ %s: %s (%s)\n\n",
                    result.track_name,
                    result.control_type,
                    result.value_formatted or "N/A"
                ))
            end
        end
    end
    
    reaper.defer(main)
end

-- Start
reaper.ShowConsoleMsg("🎛️  v7 - Manually checking mixer bounds!\n\n")
main()
