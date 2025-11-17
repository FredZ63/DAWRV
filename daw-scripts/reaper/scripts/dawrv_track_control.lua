-- DAWRV: Track Control
-- Reads ExtState parameters and controls REAPER tracks
-- Supports: select, mute, unmute, solo, unsolo, arm, volume, pan

local function log(msg)
    reaper.ShowConsoleMsg("DAWRV Track Control: " .. tostring(msg) .. "\n")
end

local function get_extstate(key, default)
    local val = reaper.GetExtState("RHEA", key) or default or ""
    return tostring(val):match("^%s*(.-)%s*$") -- trim whitespace
end

local function parse_number(str)
    local n = tonumber(str)
    if n then return n end
    return nil
end

local function main()
    local command = get_extstate("track_command", "")
    local track_num_str = get_extstate("track_number", "")
    local value_str = get_extstate("track_value", "")
    
    if command == "" then
        log("No command specified")
        return
    end
    
    log("Command: " .. command)
    log("Track number: " .. track_num_str)
    log("Value: " .. value_str)
    
    -- Parse track number
    local track_num = parse_number(track_num_str)
    if not track_num or track_num < 1 then
        log("Invalid track number")
        return
    end
    
    -- Get track (0-indexed)
    local track = reaper.GetTrack(0, track_num - 1)
    if not track then
        log("Track " .. track_num .. " not found")
        return
    end
    
    -- Execute command
    if command == "select" then
        -- Deselect all tracks first
        for i = 0, reaper.CountTracks(0) - 1 do
            local t = reaper.GetTrack(0, i)
            reaper.SetTrackSelected(t, false)
        end
        -- Select target track
        reaper.SetTrackSelected(track, true)
        reaper.SetOnlyTrackSelected(track)
        log("Selected track " .. track_num)
        
    elseif command == "mute" then
        reaper.SetMediaTrackInfo_Value(track, "B_MUTE", 1)
        log("Muted track " .. track_num)
        
    elseif command == "unmute" then
        reaper.SetMediaTrackInfo_Value(track, "B_MUTE", 0)
        log("Unmuted track " .. track_num)
        
    elseif command == "solo" then
        reaper.SetMediaTrackInfo_Value(track, "I_SOLO", 1)
        log("Soloed track " .. track_num)
        
    elseif command == "unsolo" then
        reaper.SetMediaTrackInfo_Value(track, "I_SOLO", 0)
        log("Unsoloed track " .. track_num)
        
    elseif command == "arm" then
        -- Toggle record arm
        local current_arm = reaper.GetMediaTrackInfo_Value(track, "I_RECARM")
        reaper.SetMediaTrackInfo_Value(track, "I_RECARM", current_arm == 1 and 0 or 1)
        log("Toggled record arm for track " .. track_num)
        
    elseif command == "volume" then
        local volume_percent = parse_number(value_str)
        if not volume_percent then
            log("Invalid volume value")
            return
        end
        -- Convert percentage (0-100) to dB scale
        -- 0% = -inf dB, 100% = 0 dB
        local volume_db
        if volume_percent <= 0 then
            volume_db = -150  -- Essentially muted
        else
            volume_db = 20 * math.log(volume_percent / 100, 10)
        end
        -- Convert dB to REAPER volume value (0 to 4, where 1 = 0dB)
        local reaper_vol = math.exp(volume_db * math.log(10) / 20)
        reaper.SetMediaTrackInfo_Value(track, "D_VOL", reaper_vol)
        log("Set track " .. track_num .. " volume to " .. volume_percent .. "%")
        
    elseif command == "pan" then
        local pan_value = parse_number(value_str)
        if not pan_value then
            log("Invalid pan value")
            return
        end
        -- Pan value: -100 (left) to 100 (right), REAPER uses -1 to 1
        local reaper_pan = pan_value / 100.0
        reaper.SetMediaTrackInfo_Value(track, "D_PAN", reaper_pan)
        log("Set track " .. track_num .. " pan to " .. pan_value)
        
    else
        log("Unknown command: " .. command)
    end
    
    -- Update UI
    reaper.UpdateTimeline()
    reaper.TrackList_AdjustWindows(false)
    reaper.UpdateArrange()
end

reaper.Undo_BeginBlock()
main()
reaper.Undo_EndBlock("DAWRV: Track Control", -1)
