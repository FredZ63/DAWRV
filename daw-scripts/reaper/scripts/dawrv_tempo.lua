-- DAWRV Tempo Control Script
-- Controls project tempo/BPM

local function get_tempo()
    -- Get current tempo
    local tempo = reaper.Master_GetTempo()
    return tempo
end

local function set_tempo(bpm)
    -- Set project tempo to specific BPM
    if bpm and bpm > 0 and bpm <= 300 then
        reaper.SetCurrentBPM(0, bpm, false)
        return true
    end
    return false
end

local function increase_tempo(amount)
    -- Increase tempo by amount (default 5 BPM)
    amount = amount or 5
    local current = get_tempo()
    local new_tempo = current + amount
    if new_tempo <= 300 then
        set_tempo(new_tempo)
        return true
    end
    return false
end

local function decrease_tempo(amount)
    -- Decrease tempo by amount (default 5 BPM)
    amount = amount or 5
    local current = get_tempo()
    local new_tempo = current - amount
    if new_tempo > 0 then
        set_tempo(new_tempo)
        return true
    end
    return false
end

-- Check command line arguments
local args = {...}
if #args > 0 then
    local command = args[1]
    
    if command == "get" then
        local tempo = get_tempo()
        print("Current tempo: " .. string.format("%.2f", tempo) .. " BPM")
    elseif command == "set" and args[2] then
        local bpm = tonumber(args[2])
        if bpm then
            if set_tempo(bpm) then
                print("Tempo set to " .. bpm .. " BPM")
            else
                print("Failed to set tempo")
            end
        end
    elseif command == "increase" then
        local amount = tonumber(args[2]) or 5
        if increase_tempo(amount) then
            print("Tempo increased by " .. amount .. " BPM")
        else
            print("Failed to increase tempo")
        end
    elseif command == "decrease" then
        local amount = tonumber(args[2]) or 5
        if decrease_tempo(amount) then
            print("Tempo decreased by " .. amount .. " BPM")
        else
            print("Failed to decrease tempo")
        end
    end
else
    -- No arguments - just get current tempo
    local tempo = get_tempo()
    print("Current tempo: " .. string.format("%.2f", tempo) .. " BPM")
end

