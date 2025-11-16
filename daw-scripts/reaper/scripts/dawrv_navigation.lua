-- DAWRV Navigation Scripts for REAPER
-- Custom actions for navigation and zoom

function log_action(action)
    reaper.ShowConsoleMsg("DAWRV: " .. action .. "\n")
end

local nav_commands = {
    -- Zoom Commands
    zoomin = function()
        reaper.Main_OnCommand(1011, 0) -- View: Zoom in horizontal
        log_action("Zoom In")
        return "success"
    end,
    
    zoomout = function()
        reaper.Main_OnCommand(1012, 0) -- View: Zoom out horizontal
        log_action("Zoom Out")
        return "success"
    end,
    
    zoomall = function()
        reaper.Main_OnCommand(40031, 0) -- View: Zoom to project
        log_action("Zoom All")
        return "success"
    end,
    
    -- Go to End
    gotoend = function()
        reaper.Main_OnCommand(40073, 0) -- Transport: Go to end of project
        log_action("Go to End")
        return "success"
    end
}

-- Main execution
if arg and arg[1] then
    local command = arg[1]
    if nav_commands[command] then
        local result = nav_commands[command]()
        print("Result: " .. result)
    else
        print("Error: Unknown command: " .. command)
    end
end

