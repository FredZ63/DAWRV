-- DAWRV: Full Debug - Show EVERYTHING REAPER returns

local last_track = nil

function main()
    local x, y = reaper.GetMousePosition()
    local track, context = reaper.GetTrackFromPoint(x, y)
    
    if track and track ~= last_track then
        last_track = track
        
        local track_number = math.floor(reaper.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER"))
        
        reaper.ShowConsoleMsg("\n" .. string.rep("=", 50) .. "\n")
        reaper.ShowConsoleMsg(string.format("TRACK %d DEBUG\n", track_number))
        reaper.ShowConsoleMsg(string.rep("=", 50) .. "\n")
        
        -- TCP (Track Control Panel) values
        local tcp_x = reaper.GetMediaTrackInfo_Value(track, "I_TCPX")
        local tcp_y = reaper.GetMediaTrackInfo_Value(track, "I_TCPY")
        local tcp_w = reaper.GetMediaTrackInfo_Value(track, "I_TCPW")
        local tcp_h = reaper.GetMediaTrackInfo_Value(track, "I_TCPH")
        
        reaper.ShowConsoleMsg("TCP (Track View):\n")
        reaper.ShowConsoleMsg(string.format("  X=%d Y=%d W=%d H=%d\n", tcp_x, tcp_y, tcp_w, tcp_h))
        
        -- MCP (Mixer Control Panel) values
        local mcp_x = reaper.GetMediaTrackInfo_Value(track, "I_MCPX")
        local mcp_y = reaper.GetMediaTrackInfo_Value(track, "I_MCPY")
        local mcp_w = reaper.GetMediaTrackInfo_Value(track, "I_MCPW")
        local mcp_h = reaper.GetMediaTrackInfo_Value(track, "I_MCPH")
        
        reaper.ShowConsoleMsg("MCP (Mixer):\n")
        reaper.ShowConsoleMsg(string.format("  X=%d Y=%d W=%d H=%d\n", mcp_x, mcp_y, mcp_w, mcp_h))
        
        -- Context
        reaper.ShowConsoleMsg(string.format("Context: %d (0=TCP, 1=MCP)\n", context))
        
        -- Track visibility
        local tcp_visible = reaper.GetMediaTrackInfo_Value(track, "B_SHOWINTCP")
        local mcp_visible = reaper.GetMediaTrackInfo_Value(track, "B_SHOWINMIXER")
        
        reaper.ShowConsoleMsg(string.format("Visible in TCP: %d\n", tcp_visible))
        reaper.ShowConsoleMsg(string.format("Visible in Mixer: %d\n", mcp_visible))
        
        -- Mouse position
        reaper.ShowConsoleMsg(string.format("Mouse: X=%d Y=%d\n", x, y))
        
        reaper.ShowConsoleMsg(string.rep("=", 50) .. "\n\n")
    end
    
    reaper.defer(main)
end

reaper.ShowConsoleMsg("\n🔍 FULL DEBUG MODE - Hover over tracks in MIXER!\n\n")
main()



