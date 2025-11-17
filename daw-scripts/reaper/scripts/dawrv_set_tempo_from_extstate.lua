-- DAWRV: Set Tempo (from extstate)
-- Reads "target_tempo" from RHEA extstate and sets the project tempo.

function log_msg(msg)
    reaper.ShowConsoleMsg("DAWRV Set Tempo: " .. msg .. "\n")
end

local function parse_tempo()
    local val = reaper.GetExtState("RHEA", "target_tempo") or ""
    val = tostring(val):match("^%s*(.-)%s*$")
    if val == "" then return nil end
    
    local n = tonumber(val)
    if n and n >= 1 and n <= 960 then
        return n
    end
    return nil
end

local function set_tempo(bpm)
    if not bpm or bpm < 1 or bpm > 960 then 
        return false, "invalid tempo" 
    end
    
    -- Use SetCurrentBPM which sets the global project tempo
    -- Parameters: project (0=current), bpm, undo_flag
    local success = reaper.SetCurrentBPM(0, bpm, false)
    
    -- Force display update
    reaper.UpdateTimeline()
    reaper.UpdateArrange()
    
    return true
end

local function main()
    local tempo = parse_tempo()
    if not tempo then
        log_msg("target_tempo extstate missing or invalid")
        return
    end
    
    local ok, err = set_tempo(tempo)
    if not ok then
        log_msg("Set tempo failed: " .. (err or "unknown"))
    else
        log_msg("Tempo set to " .. tempo .. " BPM")
    end
end

reaper.Undo_BeginBlock()
main()
reaper.Undo_EndBlock("DAWRV: Set Tempo", -1)

