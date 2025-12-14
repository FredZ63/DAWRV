-- DAWRV: Get Last Touched Control
-- Returns JSON with info about the last touched control in REAPER
-- Install this in REAPER's Scripts folder and assign to an action

function GetLastTouchedControlInfo()
    local result = {
        success = false,
        control_type = "unknown",
        track_number = 0,
        track_name = "",
        parameter_name = "",
        value = 0,
        value_formatted = ""
    }
    
    -- Get last touched track
    local track = reaper.GetLastTouchedTrack()
    
    if track then
        -- Get track info
        local track_number = reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER")
        local retval, track_name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
        
        result.track_number = math.floor(track_number)
        result.track_name = track_name ~= "" and track_name or ("Track " .. math.floor(track_number))
        
        -- Check for last touched FX
        local retval, tracknumber, fxnumber, paramnumber = reaper.GetLastTouchedFX()
        
        if retval then
            -- FX parameter was touched
            result.control_type = "fx-parameter"
            result.success = true
            
            local retval, fx_name = reaper.TrackFX_GetFXName(track, fxnumber, "")
            local param_value = reaper.TrackFX_GetParam(track, fxnumber, paramnumber)
            local retval, param_name = reaper.TrackFX_GetParamName(track, fxnumber, paramnumber, "")
            
            result.parameter_name = fx_name .. ": " .. param_name
            result.value = param_value
            result.value_formatted = string.format("%.2f", param_value)
            
        else
            -- Check track parameters
            
            -- Volume
            local volume = reaper.GetMediaTrackInfo_Value(track, "D_VOL")
            local db_value = 20 * math.log(volume, 10)
            
            result.control_type = "volume-fader"
            result.parameter_name = "Volume"
            result.value = volume
            result.value_formatted = string.format("%.1f dB", db_value)
            result.success = true
            
            -- Pan
            local pan = reaper.GetMediaTrackInfo_Value(track, "D_PAN")
            if math.abs(pan) > 0.01 then
                result.control_type = "pan-control"
                result.parameter_name = "Pan"
                result.value = pan
                
                if pan < 0 then
                    result.value_formatted = string.format("%.0f%% L", math.abs(pan * 100))
                else
                    result.value_formatted = string.format("%.0f%% R", pan * 100)
                end
            end
            
            -- Mute
            local mute = reaper.GetMediaTrackInfo_Value(track, "B_MUTE")
            if mute == 1 then
                result.control_type = "mute-button"
                result.parameter_name = "Mute"
                result.value = mute
                result.value_formatted = "On"
            end
            
            -- Solo
            local solo = reaper.GetMediaTrackInfo_Value(track, "I_SOLO")
            if solo > 0 then
                result.control_type = "solo-button"
                result.parameter_name = "Solo"
                result.value = solo
                result.value_formatted = "On"
            end
        end
    end
    
    -- Convert to JSON
    local json = "{"
    json = json .. '"success":' .. tostring(result.success) .. ','
    json = json .. '"control_type":"' .. result.control_type .. '",'
    json = json .. '"track_number":' .. result.track_number .. ','
    json = json .. '"track_name":"' .. result.track_name .. '",'
    json = json .. '"parameter_name":"' .. result.parameter_name .. '",'
    json = json .. '"value":' .. result.value .. ','
    json = json .. '"value_formatted":"' .. result.value_formatted .. '"'
    json = json .. "}"
    
    return json
end

-- Main execution
local json_result = GetLastTouchedControlInfo()
reaper.ShowConsoleMsg(json_result .. "\n")




