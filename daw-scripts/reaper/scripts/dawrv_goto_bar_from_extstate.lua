-- RHEA: Go To Bar (from extstate)
-- Reads extstate RHEA/target_bar and moves the edit cursor to the start of that bar.

local function log(msg)
    reaper.ShowConsoleMsg(("RHEA: %s\n"):format(tostring(msg)))
end

local function parse_bar()
    local val = reaper.GetExtState("RHEA", "target_bar") or ""
    val = tostring(val):match("^%s*(.-)%s*$")
    if val == "" then return nil end

    -- Try numeric first
    local n = tonumber(val)
    if n and n > 0 then return math.floor(n) end

    -- Fallback: very simple word numbers (e.g., "seven", "twenty three")
    local units = {
        zero=0, one=1, two=2, three=3, four=4, five=5, six=6, seven=7,
        eight=8, nine=9, ten=10, eleven=11, twelve=12, thirteen=13, fourteen=14,
        fifteen=15, sixteen=16, seventeen=17, eighteen=18, nineteen=19
    }
    local tens = { twenty=20, thirty=30, forty=40, fifty=50, sixty=60, seventy=70, eighty=80, ninety=90 }

    local total = 0
    local current = 0
    for w in val:lower():gmatch("[a-z]+") do
        if units[w] ~= nil then
            current = current + units[w]
        elseif tens[w] ~= nil then
            current = current + tens[w]
        elseif w == "hundred" then
            if current == 0 then current = 1 end
            current = current * 100
        end
    end
    total = total + current
    if total > 0 then return total end
    return nil
end

local function set_cursor_seconds(pos, seekplay)
    if not pos then return end
    -- move edit cursor and refresh UI/transport
    reaper.SetEditCurPos(pos, true, seekplay and true or false)
    if reaper.CSurf_OnPlayPositionChange then
        reaper.CSurf_OnPlayPositionChange(pos, seekplay and true or false)
    end
    reaper.UpdateTimeline()
    reaper.TrackList_AdjustWindows(false)
    reaper.UpdateArrange()
end

local function goto_bar(bar)
    if not bar or bar < 1 then return false, "invalid bar" end
    local idx = bar - 1
    -- TimeMap_GetMeasureInfo returns QN range; convert to seconds
    local ok, qn_start, qn_end = reaper.TimeMap_GetMeasureInfo(0, idx)
    if not ok or not qn_start then
        return false, "measure info not available"
    end
    local pos = reaper.TimeMap2_QNToTime(0, qn_start)
    set_cursor_seconds(pos, false)
    return true
end

local function main()
    local bar = parse_bar()
    if not bar then
        log("target_bar extstate missing or invalid")
        return
    end
    local ok, err = goto_bar(bar)
    if not ok then
        log(("Go to bar failed: %s"):format(err or "unknown"))
    else
        log(("Moved to bar %d"):format(bar))
    end
end

reaper.Undo_BeginBlock()
main()
reaper.Undo_EndBlock("RHEA: Go To Bar (from extstate)", -1)


