-- DAWRV Transport Control for REAPER
-- Controls playback, recording, and transport functions

function log_action(action)
    reaper.ShowConsoleMsg("DAWRV: " .. action .. "\n")
end

-- Transport Commands
local transport_commands = {
    play = function()
        reaper.Main_OnCommand(1007, 0) -- Transport: Play
        log_action("Play")
        return "success"
    end,
    
    stop = function()
        reaper.Main_OnCommand(1016, 0) -- Transport: Stop
        log_action("Stop")
        return "success"
    end,
    
    pause = function()
        reaper.Main_OnCommand(1008, 0) -- Transport: Pause
        log_action("Pause")
        return "success"
    end,
    
    record = function()
        reaper.Main_OnCommand(1013, 0) -- Transport: Record
        log_action("Record")
        return "success"
    end
}

-- Main execution
if arg and arg[1] then
    local command = arg[1]
    if transport_commands[command] then
        local result = transport_commands[command]()
        print("Result: " .. result)
    else
        print("Error: Unknown command")
    end
end
