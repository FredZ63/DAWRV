-- DAWRV Track Control Scripts for REAPER
-- Custom actions for track control via voice commands

function log_action(action)
    reaper.ShowConsoleMsg("DAWRV: " .. action .. "\n")
end

-- Get selected track
function get_selected_track()
    local track = reaper.GetSelectedTrack(0, 0)
    return track
end

-- Track Commands
local track_commands = {
    -- Mute/Unmute
    mute = function()
        local track = get_selected_track()
        if track then
            local mute_state = reaper.GetMediaTrackInfo_Value(track, "B_MUTE")
            reaper.SetMediaTrackInfo_Value(track, "B_MUTE", 1)
            log_action("Mute")
            return "success"
        else
            log_action("Mute - No track selected")
            return "no_track"
        end
    end,
    
    unmute = function()
        local track = get_selected_track()
        if track then
            reaper.SetMediaTrackInfo_Value(track, "B_MUTE", 0)
            log_action("Unmute")
            return "success"
        else
            log_action("Unmute - No track selected")
            return "no_track"
        end
    end,
    
    -- Solo/Unsolo
    solo = function()
        local track = get_selected_track()
        if track then
            reaper.SetMediaTrackInfo_Value(track, "I_SOLO", 1)
            log_action("Solo")
            return "success"
        else
            log_action("Solo - No track selected")
            return "no_track"
        end
    end,
    
    unsolo = function()
        local track = get_selected_track()
        if track then
            reaper.SetMediaTrackInfo_Value(track, "I_SOLO", 0)
            log_action("Unsolo")
            return "success"
        else
            log_action("Unsolo - No track selected")
            return "no_track"
        end
    end,
    
    -- Track Navigation
    nexttrack = function()
        local track = get_selected_track()
        if track then
            local track_num = reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER")
            local total_tracks = reaper.CountTracks(0)
            if track_num < total_tracks then
                local next_track = reaper.GetTrack(0, track_num)
                reaper.SetOnlyTrackSelected(next_track)
                log_action("Next Track")
                return "success"
            else
                log_action("Next Track - Already at last track")
                return "at_end"
            end
        else
            -- Select first track if none selected
            local first_track = reaper.GetTrack(0, 0)
            if first_track then
                reaper.SetOnlyTrackSelected(first_track)
                log_action("Next Track - Selected first track")
                return "success"
            end
            return "no_tracks"
        end
    end,
    
    previoustrack = function()
        local track = get_selected_track()
        if track then
            local track_num = reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER")
            if track_num > 1 then
                local prev_track = reaper.GetTrack(0, track_num - 2)
                reaper.SetOnlyTrackSelected(prev_track)
                log_action("Previous Track")
                return "success"
            else
                log_action("Previous Track - Already at first track")
                return "at_start"
            end
        else
            -- Select last track if none selected
            local total_tracks = reaper.CountTracks(0)
            if total_tracks > 0 then
                local last_track = reaper.GetTrack(0, total_tracks - 1)
                reaper.SetOnlyTrackSelected(last_track)
                log_action("Previous Track - Selected last track")
                return "success"
            end
            return "no_tracks"
        end
    end,
    
    -- New Track
    newtrack = function()
        reaper.InsertTrackAtIndex(reaper.CountTracks(0), false)
        log_action("New Track")
        return "success"
    end,
    
    -- Delete Track
    deletetrack = function()
        local track = get_selected_track()
        if track then
            reaper.DeleteTrack(track)
            log_action("Delete Track")
            return "success"
        else
            log_action("Delete Track - No track selected")
            return "no_track"
        end
    end
}

-- Main execution
if arg and arg[1] then
    local command = arg[1]
    if track_commands[command] then
        local result = track_commands[command]()
        print("Result: " .. result)
    else
        print("Error: Unknown command: " .. command)
    end
end

