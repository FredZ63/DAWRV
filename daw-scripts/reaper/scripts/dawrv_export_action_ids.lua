-- DAWRV Automatic Action ID Exporter
-- This script exports all action IDs to a JSON file for automatic processing
-- Run this in REAPER, then use parse_action_ids.py to update rhea.js

local json = require("json")

local output_file = reaper.GetResourcePath() .. "/dawrv_actions.json"
local actions = {}

-- Function to search for actions by name pattern
function find_actions_by_pattern(pattern)
    local found = {}
    for i = 0, reaper.CountActions() - 1 do
        local retval, action_name = reaper.GetActionName(i)
        if action_name and string.find(string.lower(action_name), string.lower(pattern)) then
            table.insert(found, {
                id = i,
                name = action_name
            })
        end
    end
    return found
end

-- Find DAWRV-related actions
actions.dawrv_scripts = {}
actions.dawrv_scripts.transport = find_actions_by_pattern("dawrv.*transport")
actions.dawrv_scripts.track = find_actions_by_pattern("dawrv.*track")
actions.dawrv_scripts.navigation = find_actions_by_pattern("dawrv.*navigation")

-- Find common REAPER actions we use
actions.common = {
    play = find_actions_by_pattern("transport.*play"),
    stop = find_actions_by_pattern("transport.*stop"),
    record = find_actions_by_pattern("transport.*record"),
    pause = find_actions_by_pattern("transport.*pause"),
    mute = find_actions_by_pattern("track.*mute"),
    solo = find_actions_by_pattern("track.*solo"),
    zoom_in = find_actions_by_pattern("zoom.*in"),
    zoom_out = find_actions_by_pattern("zoom.*out"),
    new_track = find_actions_by_pattern("insert.*track"),
    marker = find_actions_by_pattern("marker")
}

-- Write to JSON file
local file = io.open(output_file, "w")
if file then
    file:write(json.encode(actions, {indent = true}))
    file:close()
    reaper.ShowMessageBox(
        "Action IDs exported to:\n" .. output_file .. "\n\n" ..
        "Run: python3 parse_action_ids.py",
        "DAWRV Export Complete",
        0
    )
else
    reaper.ShowMessageBox("Could not write to: " .. output_file, "Error", 0)
end

