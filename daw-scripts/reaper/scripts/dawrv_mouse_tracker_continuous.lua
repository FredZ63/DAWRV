-- DAWRV: Continuous Mouse Tracker
-- Constantly monitors what control is under the mouse cursor
-- Sends data to RHEA for accurate control identification

-- How fast to poll (in seconds) - 0.1 = 10 times per second
local POLL_INTERVAL = 0.1
local last_poll_time = 0

-- Track last detected control to avoid spam
local last_control = {}

-- Track mouse button state to detect clicks
local last_mouse_state = 0  -- 0 = not pressed, 1 = pressed
local last_clicked_control = nil

-- Initialize gfx for mouse state detection
gfx.init("RHEA Mouse Tracker", 0, 0, 0, 0, 0)

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
        position = {x = x, y = y},
        timestamp = reaper.time_precise()
    }
    
    -- Check segment for transport controls (segment starts with "trans.")
    local seg_lower = segment and string.lower(tostring(segment)) or ""
    
    -- TRANSPORT DETECTION: segment starts with "trans."
    if seg_lower:find("^trans") then
        result.success = true
        result.context = "transport"
        result.track_number = 0
        result.track_name = "Transport"
        
        -- Identify specific transport button from segment
        local play_state = reaper.GetPlayState()
        
        if seg_lower == "trans.play" then
            result.control_type = "play_button"
            result.value = play_state
            result.value_formatted = (play_state & 1) == 1 and "playing" or "stopped"
        elseif seg_lower == "trans.stop" then
            result.control_type = "stop_button"
            result.value = play_state
            result.value_formatted = play_state == 0 and "stopped" or "active"
        elseif seg_lower == "trans.rec" or seg_lower == "trans.record" then
            result.control_type = "record_button"
            result.value = play_state
            result.value_formatted = (play_state & 4) == 4 and "recording" or "not recording"
        elseif seg_lower == "trans.pause" then
            result.control_type = "pause_button"
            result.value = play_state
            result.value_formatted = (play_state & 2) == 2 and "paused" or "not paused"
        elseif seg_lower == "trans.rew" or seg_lower == "trans.rewind" then
            result.control_type = "rewind_button"
            result.value_formatted = "rewind"
        elseif seg_lower == "trans.fwd" or seg_lower == "trans.forward" then
            result.control_type = "forward_button"
            result.value_formatted = "fast forward"
        elseif seg_lower == "trans.loop" or seg_lower == "trans.repeat" then
            result.control_type = "loop_button"
            local loop_state = reaper.GetSetRepeat(-1)
            result.value = loop_state
            result.value_formatted = loop_state == 1 and "loop on" or "loop off"
        elseif seg_lower == "trans.metro" or seg_lower == "trans.click" then
            result.control_type = "metronome_button"
            local metro = reaper.GetToggleCommandState(40364)
            result.value = metro
            result.value_formatted = metro == 1 and "metronome on" or "metronome off"
        elseif seg_lower == "trans.status" then
            result.control_type = "time_display"
            result.value_formatted = "time display"
        elseif seg_lower == "trans.bpm" or seg_lower == "trans.rate" then
            result.control_type = "tempo_display"
            local tempo = reaper.Master_GetTempo()
            result.value = tempo
            result.value_formatted = string.format("%.1f BPM", tempo)
        else
            -- Generic transport control
            result.control_type = "transport_control"
            result.value_formatted = seg_lower
        end
        
        reaper.ShowConsoleMsg(string.format("✅ TRANSPORT DETECTED: type=%s value=%s\n", result.control_type, result.value_formatted or "N/A"))
        return result
    end
    
    if not window then
        return result
    end
    
    -- CHECK FOR MENUS/DIALOGS/POPUPS
    -- If we're over a menu or popup, don't announce underlying controls
    -- Window types that indicate menus/dialogs: "menu", "dialog", "fx", "popup"
    local window_lower = window and string.lower(tostring(window)) or ""
    
    -- Detect menu/popup windows - these block underlying control detection
    if window_lower:find("menu") or 
       window_lower:find("popup") or 
       window_lower:find("dialog") or
       segment == "fx_browser" or
       segment == "menu" then
        -- Over a menu/popup - don't announce anything
        return result
    end
    
    -- Also check if FX window or other floating window has focus
    -- This catches the FX dropdown menu case
    local hwnd_focus = reaper.JS_Window_GetFocus and reaper.JS_Window_GetFocus()
    if hwnd_focus then
        local focus_class = reaper.JS_Window_GetClassName and reaper.JS_Window_GetClassName(hwnd_focus) or ""
        local focus_lower = string.lower(focus_class)
        if focus_lower:find("menu") or focus_lower:find("popup") or focus_lower:find("#32768") then
            -- #32768 is the Windows class name for popup menus
            return result
        end
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
        
        -- SMART CONTEXT DETECTION using GetThingFromPoint segment name
        -- This properly detects docked mixer vs track panel
        local window, segment, details = reaper.GetThingFromPoint(x, y)
        local window_lower = window and string.lower(tostring(window)) or ""
        local segment_lower = segment and string.lower(tostring(segment)) or ""
        
        -- Determine actual context from SEGMENT NAME (most reliable for docked mixer)
        local actual_context = context
        
        -- Check segment for MCP indicators (mcp.volume, mcp.pan, mcp.meter, etc.)
        if segment_lower:find("^mcp") or segment_lower:find("mixer") then
            actual_context = 1 -- MCP = Mixer = Channel
        elseif segment_lower:find("^tcp") or window_lower:find("tcp") then
            actual_context = 0 -- TCP = Track Panel
        elseif window_lower:find("mixer") or window_lower:find("mcp") then
            actual_context = 1 -- Mixer window
        elseif window_lower:find("arrange") then
            actual_context = 2 -- Arrange
        else
            -- Fallback: Check if MCP has valid dimensions (track is visible in mixer)
            local mcp_w = reaper.GetMediaTrackInfo_Value(track, "I_MCPW")
            local mcp_h = reaper.GetMediaTrackInfo_Value(track, "I_MCPH")
            local tcp_w = reaper.GetMediaTrackInfo_Value(track, "I_TCPW")
            local tcp_h = reaper.GetMediaTrackInfo_Value(track, "I_TCPH")
            
            -- If MCP is visible and TCP isn't (or MCP is taller), assume mixer
            if mcp_w > 0 and mcp_h > 0 and (tcp_w == 0 or mcp_h > tcp_h * 2) then
                actual_context = 1 -- Likely mixer
            end
        end
        
        -- Identify control type based on ACTUAL context
        if actual_context == 0 then
            -- TCP (Track Control Panel)
            result.context = "tcp"
            result.control_type = identify_tcp_control(track, x, y)
        elseif actual_context == 1 then
            -- MCP (Mixer Control Panel) - INCLUDES DOCKED MIXER!
            result.context = "mcp"
            result.control_type = identify_mcp_control(track, x, y)
        else
            result.context = "arrange"
            result.control_type = "track_area"
        end
        
        -- Get current values for identified controls
        populate_control_values(track, result)
    end
    
    return result
end

function populate_control_values(track, result)
    -- Get current values based on control type
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
        
    elseif result.control_type == "fx_button" or result.control_type == "fx" then
        local fx_count = reaper.TrackFX_GetCount(track)
        result.parameter = "FX"
        result.value = fx_count
        result.value_formatted = fx_count > 0 and (fx_count .. " FX") or "no FX"
        
    elseif result.control_type == "width_control" or result.control_type == "width" then
        local width = reaper.GetMediaTrackInfo_Value(track, "D_WIDTH")
        result.parameter = "Width"
        result.value = width
        -- Width: -1 = mono, 0 = normal stereo, 1 = wide stereo
        if width < -0.5 then
            result.value_formatted = "mono"
        elseif width < 0.1 then
            result.value_formatted = string.format("%.0f%% narrow", (1 + width) * 100)
        elseif width < 0.9 then
            result.value_formatted = "stereo"
        else
            result.value_formatted = string.format("%.0f%% wide", width * 100)
        end
        
    elseif result.control_type == "phase_button" or result.control_type == "phase" then
        local phase = reaper.GetMediaTrackInfo_Value(track, "B_PHASE")
        result.parameter = "Phase"
        result.value = phase
        result.value_formatted = phase == 1 and "inverted" or "normal"
        
    elseif result.control_type == "meter" then
        result.parameter = "Meter"
        result.value_formatted = "level meter"
        
    elseif result.control_type == "track_label" then
        result.parameter = "Track Name"
        result.value_formatted = result.track_name
    end
end

function identify_tcp_control(track, x, y)
    -- Track Control Panel - Use REAPER's actual control detection when possible
    local track_y_start = reaper.GetMediaTrackInfo_Value(track, "I_TCPY")
    local track_height = reaper.GetMediaTrackInfo_Value(track, "I_TCPH")
    local track_x_start = reaper.GetMediaTrackInfo_Value(track, "I_TCPX")
    local track_width = reaper.GetMediaTrackInfo_Value(track, "I_TCPW")
    
    -- Get what REAPER thinks is under the mouse
    local window, segment, details = reaper.GetThingFromPoint(x, y)
    local seg_lower = segment and string.lower(tostring(segment)) or ""
    
    -- REAPER returns segment info for track controls
    if seg_lower:find("mute") then return "mute_button" end
    if seg_lower:find("solo") then return "solo_button" end
    if seg_lower:find("recarm") or seg_lower:find("arm") then return "record_arm" end
    if seg_lower:find("fx") or seg_lower:find("plugin") then return "fx_button" end
    if seg_lower:find("pan") then return "pan_control" end
    if seg_lower:find("vol") or seg_lower:find("fader") then return "volume_fader" end
    if seg_lower:find("width") then return "width_control" end
    if seg_lower:find("phase") or seg_lower:find("polarity") then return "phase_button" end
    if seg_lower:find("meter") then return "meter" end
    if seg_lower:find("label") or seg_lower:find("name") then return "track_label" end
    if seg_lower:find("io") or seg_lower:find("route") or seg_lower:find("input") then return "io_button" end
    if seg_lower:find("env") then return "envelope_button" end
    
    -- Fallback: Use position-based detection
    local relative_y = y - track_y_start
    local relative_x = x - track_x_start
    local x_ratio = relative_x / track_width
    local y_ratio = relative_y / track_height
    
    -- Position-based fallback
    if x_ratio < 0.30 then
        -- Left side: buttons stacked vertically
        if y_ratio < 0.33 then
            return "mute_button"
        elseif y_ratio < 0.66 then
            return "solo_button"
        else
            return "record_arm"
        end
    elseif x_ratio > 0.70 then
        -- Right side: volume fader
        return "volume_fader"
    else
        -- Middle: pan, labels, etc.
        if y_ratio < 0.30 then
            return "pan_control"
        else
            return "track_label"
        end
    end
end

function identify_mcp_control(track, x, y)
    -- Mixer Control Panel - Use REAPER's actual control detection when possible
    local mcp_y_start = reaper.GetMediaTrackInfo_Value(track, "I_MCPY")
    local mcp_height = reaper.GetMediaTrackInfo_Value(track, "I_MCPH")
    local mcp_x_start = reaper.GetMediaTrackInfo_Value(track, "I_MCPX")
    local mcp_width = reaper.GetMediaTrackInfo_Value(track, "I_MCPW")
    
    -- Get what REAPER thinks is under the mouse
    local window, segment, details = reaper.GetThingFromPoint(x, y)
    local seg_lower = segment and string.lower(tostring(segment)) or ""
    
    -- DEBUG: Always log segment for MCP controls
    -- reaper.ShowConsoleMsg(string.format("MCP segment: '%s' details: '%s'\n", seg_lower, tostring(details)))
    
    -- REAPER returns segment info for mixer controls - check for MCP-specific patterns first
    -- Patterns: "mcp.mute", "mcp.solo", "mcp.volume", "mcp.pan", etc.
    if seg_lower:find("mute") then return "mute_button" end
    if seg_lower:find("solo") then return "solo_button" end
    if seg_lower:find("recarm") or seg_lower:find("arm") or seg_lower:find("rec") then return "record_arm" end
    if seg_lower:find("fx") or seg_lower:find("plugin") then return "fx_button" end
    if seg_lower:find("pan") then return "pan_control" end
    if seg_lower:find("vol") or seg_lower:find("fader") then return "volume_fader" end
    if seg_lower:find("width") then return "width_control" end
    if seg_lower:find("phase") or seg_lower:find("polarity") then return "phase_button" end
    if seg_lower:find("meter") then return "meter" end
    if seg_lower:find("label") or seg_lower:find("name") then return "track_label" end
    if seg_lower:find("io") or seg_lower:find("route") then return "io_button" end
    if seg_lower:find("env") then return "envelope_button" end
    
    -- Fallback: Use position-based detection for themes that don't return segment info
    if mcp_width <= 0 or mcp_height <= 0 then
        return "track_area"
    end
    
    local relative_y = y - mcp_y_start
    local relative_x = x - mcp_x_start
    local x_ratio = relative_x / mcp_width
    local y_ratio = relative_y / mcp_height
    
    -- Position-based fallback (for themes where segment isn't provided)
    if y_ratio < 0.12 then
        -- Top: track name/label
        return "track_label"
    elseif y_ratio < 0.25 then
        -- Near top: pan/width knobs
        if x_ratio < 0.5 then
            return "pan_control"
        else
            return "width_control"
        end
    elseif y_ratio > 0.85 then
        -- Bottom: buttons (mute/solo/arm/fx)
        if x_ratio < 0.25 then
            return "mute_button"
        elseif x_ratio < 0.50 then
            return "solo_button"
        elseif x_ratio < 0.75 then
            return "record_arm"
        else
            return "fx_button"
        end
    else
        -- Middle: volume fader
        return "volume_fader"
    end
end

function has_control_changed(new_control)
    -- Check if this is a different control than last time
    if not last_control.success then
        return true
    end
    
    if new_control.success ~= last_control.success then
        return true
    end
    
    if new_control.track_guid ~= last_control.track_guid then
        return true
    end
    
    if new_control.control_type ~= last_control.control_type then
        return true
    end
    
    -- Check if value changed significantly
    if new_control.value and last_control.value then
        if math.abs(new_control.value - last_control.value) > 0.01 then
            return true
        end
    end
    
    return false
end

function write_control_to_extstate(result)
    -- Write result to ExtState for DAWRV to read
    -- IMPORTANT: Use 'true' to persist to file so DAWRV can read it!
    if result.success then
        reaper.SetExtState("RHEA", "control_detected", "true", true)
        reaper.SetExtState("RHEA", "control_type", result.control_type or "", true)
        reaper.SetExtState("RHEA", "control_context", result.context or "", true)
        reaper.SetExtState("RHEA", "track_number", tostring(result.track_number or ""), true)
        reaper.SetExtState("RHEA", "track_name", result.track_name or "", true)
        reaper.SetExtState("RHEA", "track_guid", result.track_guid or "", true)
        reaper.SetExtState("RHEA", "parameter", result.parameter or "", true)
        reaper.SetExtState("RHEA", "value", tostring(result.value or ""), true)
        reaper.SetExtState("RHEA", "value_formatted", result.value_formatted or "", true)
        reaper.SetExtState("RHEA", "timestamp", tostring(result.timestamp), true)
    else
        reaper.SetExtState("RHEA", "control_detected", "false", true)
    end
end

function main()
    local current_time = reaper.time_precise()
    
    -- Only poll at specified interval
    if current_time - last_poll_time >= POLL_INTERVAL then
        last_poll_time = current_time
        
        -- Detect what's under the mouse
        local result = detect_control_under_mouse()
        
        -- DETECT MOUSE CLICKS for learning!
        -- gfx.mouse_cap & 1 = left mouse button is pressed
        local mouse_pressed = (gfx.mouse_cap & 1) == 1
        local mouse_state = mouse_pressed and 1 or 0
        
        -- Check if click just happened (button was pressed, now released)
        if last_mouse_state == 1 and mouse_state == 0 then
            -- Click detected! Send to learning system
            if result.success then
                reaper.SetExtState("RHEA", "control_clicked", "true", true)
                reaper.SetExtState("RHEA", "clicked_type", result.control_type or "", true)
                reaper.SetExtState("RHEA", "clicked_track", tostring(result.track_number or ""), true)
                reaper.SetExtState("RHEA", "clicked_guid", result.track_guid or "", true)
                reaper.SetExtState("RHEA", "click_timestamp", tostring(current_time), true)
                
                reaper.ShowConsoleMsg(string.format(
                    "🖱️  CLICK DETECTED: %s on %s (LEARNING!)\n",
                    result.control_type,
                    result.track_name
                ))
                
                last_clicked_control = result
            end
        end
        
        last_mouse_state = mouse_state
        
        -- Only write hover data if control changed (reduce spam)
        local changed = has_control_changed(result)
        
        -- DEBUG: Always log transport controls
        if result.context == "transport" then
            reaper.ShowConsoleMsg(string.format("🚦 Transport check: changed=%s type=%s\n", tostring(changed), result.control_type))
        end
        
        if changed then
            write_control_to_extstate(result)
            
            -- Update last control
            last_control = result
            
            -- Debug output
            if result.success then
                reaper.ShowConsoleMsg(string.format(
                    "📝 WROTE TO EXTSTATE: %s on %s (%s)\n",
                    result.control_type,
                    result.track_name,
                    result.value_formatted or "N/A"
                ))
            end
        end
    end
    
    -- Keep running (defer)
    reaper.defer(main)
end

-- Start the continuous monitoring
reaper.ShowConsoleMsg("🎛️  RHEA Mouse Tracker started - monitoring controls...\n")
main()

