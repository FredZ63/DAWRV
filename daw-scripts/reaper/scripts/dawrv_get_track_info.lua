-- DAWRV: Get Track Information
-- Returns track name, number, and GUID for a specific track
-- Usage: Called via Web API to get track details before operations

function get_track_info(track_number)
    local track = reaper.GetTrack(0, track_number - 1) -- 0-based in API
    
    if not track then
        return nil, "Track " .. track_number .. " does not exist"
    end
    
    -- Get track name
    local _, track_name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
    if track_name == "" then
        track_name = "Track " .. track_number
    end
    
    -- Get track GUID (unique identifier)
    local track_guid = reaper.GetTrackGUID(track)
    
    -- Get track color
    local track_color = reaper.GetTrackColor(track)
    
    -- Check if track is selected
    local is_selected = reaper.IsTrackSelected(track)
    
    return {
        number = track_number,
        name = track_name,
        guid = track_guid,
        color = track_color,
        selected = is_selected,
        exists = true
    }
end

-- If called with argument, return track info for that track
local track_num = tonumber(reaper.GetExtState("RHEA", "query_track_number"))
if track_num then
    local info, error_msg = get_track_info(track_num)
    
    if info then
        -- Write track info to ExtState for main process to read
        reaper.SetExtState("RHEA", "track_info_name", info.name, false)
        reaper.SetExtState("RHEA", "track_info_guid", info.guid, false)
        reaper.SetExtState("RHEA", "track_info_exists", "true", false)
    else
        reaper.SetExtState("RHEA", "track_info_exists", "false", false)
        reaper.SetExtState("RHEA", "track_info_error", error_msg or "Unknown error", false)
    end
    
    -- Clear the query
    reaper.SetExtState("RHEA", "query_track_number", "", false)
end



