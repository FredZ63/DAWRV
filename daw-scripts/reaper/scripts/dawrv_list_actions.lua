-- DAWRV Action ID Finder
-- Lists all REAPER actions and their IDs
-- Run this in REAPER to find action IDs for voice commands

local output_file = reaper.GetResourcePath() .. "/dawrv_action_ids.txt"
local file = io.open(output_file, "w")

if not file then
    reaper.ShowMessageBox("Could not create output file: " .. output_file, "Error", 0)
    return
end

file:write("REAPER Action IDs for DAWRV\n")
file:write("=" .. string.rep("=", 60) .. "\n\n")
file:write("Generated: " .. os.date() .. "\n\n")

-- Search for DAWRV-related actions
local search_terms = {
    "DAWRV",
    "dawrv",
    "transport",
    "track",
    "mute",
    "solo",
    "zoom",
    "marker"
}

file:write("DAWRV Script Actions:\n")
file:write("-" .. string.rep("-", 60) .. "\n")

for i = 0, reaper.CountActions() - 1 do
    local cmd_id = reaper.NamedCommandLookup("_DAWRV_" .. i)
    if cmd_id == 0 then
        cmd_id = reaper.NamedCommandLookup("DAWRV_" .. i)
    end
    
    local retval, action_name = reaper.GetActionName(i)
    if action_name then
        local name_lower = string.lower(action_name)
        
        -- Check if it's a DAWRV script
        if string.find(name_lower, "dawrv") or 
           string.find(name_lower, "transport") or
           string.find(name_lower, "track") or
           string.find(name_lower, "navigation") then
            file:write(string.format("ID: %d | Name: %s\n", i, action_name))
        end
    end
end

file:write("\n\nCommon REAPER Actions:\n")
file:write("-" .. string.rep("-", 60) .. "\n")

-- List common actions we use
local common_actions = {
    {name = "Transport: Play", id = 1007},
    {name = "Transport: Stop", id = 1016},
    {name = "Transport: Record", id = 1013},
    {name = "Transport: Pause", id = 1008},
    {name = "Transport: Rewind", id = 1014},
    {name = "Transport: Loop", id = 1068},
    {name = "Edit: Undo", id = 40029},
    {name = "Edit: Redo", id = 40030},
    {name = "Edit: Cut", id = 40001},
    {name = "Edit: Copy", id = 40003},
    {name = "Edit: Paste", id = 40004},
    {name = "Edit: Delete", id = 40005},
    {name = "File: Save project", id = 40026},
    {name = "Track: Insert new track", id = 40001},
    {name = "View: Zoom in horizontal", id = 1011},
    {name = "View: Zoom out horizontal", id = 1012},
}

for _, action in ipairs(common_actions) do
    file:write(string.format("ID: %d | Name: %s\n", action.id, action.name))
end

file:close()

reaper.ShowMessageBox(
    "Action IDs exported to:\n" .. output_file .. "\n\n" ..
    "Use update_action_ids.sh to automatically update rhea.js",
    "DAWRV Action ID Export",
    0
)

reaper.ShowConsoleMsg("DAWRV: Action IDs exported to " .. output_file .. "\n")

