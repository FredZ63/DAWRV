-- ATLAS Pro Bridge for REAPER (LOCAL-FIRST, RELIABLE)
-- ==================================================
-- This script runs inside REAPER and listens for commands from ATLAS Pro via a local file.
-- It does NOT rely on REAPER responding to arbitrary OSC messages (REAPER doesn't by default).
--
-- What it does:
-- - ATLAS writes commands to:  REAPER_RESOURCE/ATLAS/bridge/in.txt
-- - This script polls that file (lightweight) and executes commands:
--     ping, load_patch, save_patch
-- - It writes status/acks to:  REAPER_RESOURCE/ATLAS/bridge/out.txt
--
-- Install:
-- 1) Copy this file to: ~/Library/Application Support/REAPER/Scripts/Atlas/atlas-bridge.lua
-- 2) In REAPER: Actions -> Show action list... -> ReaScript -> Load...
-- 3) Select this file, then Run it.
-- 4) Keep it running (it will keep polling in the background).

local BRIDGE_VERSION = "atlas-bridge.lua v2 (kit-session build_session)"

local function now_ms()
  return math.floor(reaper.time_precise() * 1000.0)
end

local function trim(s)
  return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function parse_kv(text)
  local t = {}
  for line in (text .. "\n"):gmatch("(.-)\n") do
    line = trim(line)
    if line ~= "" and not line:match("^#") then
      local k, v = line:match("^([^=]+)=(.*)$")
      if k then
        t[trim(k)] = trim(v or "")
      end
    end
  end
  return t
end

local function read_file(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local c = f:read("*a")
  f:close()
  return c
end

local function write_file(path, content)
  local f = io.open(path, "w")
  if not f then return false end
  f:write(content)
  f:close()
  return true
end

local function ensure_dir(dir)
  reaper.RecursiveCreateDirectory(dir, 0)
end

local function ci_contains(hay, needle)
  if not hay or not needle then return false end
  return string.find(string.lower(hay), string.lower(needle), 1, true) ~= nil
end

-- Minimal JSON decoder (supports objects, arrays, strings, numbers, booleans, null)
-- Enough for ATLAS Pro session payloads.
local function json_decode(str)
  local i = 1
  local s = tostring(str or "")

  local function is_ws(c)
    return c == ' ' or c == '\t' or c == '\r' or c == '\n'
  end

  local function skip_ws()
    while i <= #s and is_ws(s:sub(i, i)) do i = i + 1 end
  end

  local function parse_error(msg)
    error("JSON parse error at " .. tostring(i) .. ": " .. tostring(msg))
  end

  local function parse_literal(lit, val)
    if s:sub(i, i + #lit - 1) == lit then
      i = i + #lit
      return val
    end
    parse_error("expected " .. lit)
  end

  local function parse_string()
    if s:sub(i, i) ~= '"' then parse_error("expected string") end
    i = i + 1
    local out = {}
    while i <= #s do
      local c = s:sub(i, i)
      if c == '"' then
        i = i + 1
        return table.concat(out)
      elseif c == '\\' then
        local n = s:sub(i + 1, i + 1)
        if n == '"' or n == '\\' or n == '/' then
          table.insert(out, n); i = i + 2
        elseif n == 'b' then table.insert(out, '\b'); i = i + 2
        elseif n == 'f' then table.insert(out, '\f'); i = i + 2
        elseif n == 'n' then table.insert(out, '\n'); i = i + 2
        elseif n == 'r' then table.insert(out, '\r'); i = i + 2
        elseif n == 't' then table.insert(out, '\t'); i = i + 2
        elseif n == 'u' then
          local hex = s:sub(i + 2, i + 5)
          if not hex:match("^[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]$") then
            parse_error("invalid unicode escape")
          end
          -- Basic BMP handling; encode as UTF-8
          local code = tonumber(hex, 16)
          if code < 0x80 then
            table.insert(out, string.char(code))
          elseif code < 0x800 then
            table.insert(out, string.char(0xC0 + math.floor(code / 0x40)))
            table.insert(out, string.char(0x80 + (code % 0x40)))
          else
            table.insert(out, string.char(0xE0 + math.floor(code / 0x1000)))
            table.insert(out, string.char(0x80 + (math.floor(code / 0x40) % 0x40)))
            table.insert(out, string.char(0x80 + (code % 0x40)))
          end
          i = i + 6
        else
          parse_error("invalid escape")
        end
      else
        table.insert(out, c)
        i = i + 1
      end
    end
    parse_error("unterminated string")
  end

  local function parse_number()
    local start = i
    local c = s:sub(i, i)
    if c == '-' then i = i + 1 end
    if s:sub(i, i) == '0' then
      i = i + 1
    else
      if not s:sub(i, i):match("%d") then parse_error("invalid number") end
      while s:sub(i, i):match("%d") do i = i + 1 end
    end
    if s:sub(i, i) == '.' then
      i = i + 1
      if not s:sub(i, i):match("%d") then parse_error("invalid number") end
      while s:sub(i, i):match("%d") do i = i + 1 end
    end
    local e = s:sub(i, i)
    if e == 'e' or e == 'E' then
      i = i + 1
      local sign = s:sub(i, i)
      if sign == '+' or sign == '-' then i = i + 1 end
      if not s:sub(i, i):match("%d") then parse_error("invalid exponent") end
      while s:sub(i, i):match("%d") do i = i + 1 end
    end
    local num = tonumber(s:sub(start, i - 1))
    if num == nil then parse_error("invalid number") end
    return num
  end

  local parse_value

  local function parse_array()
    if s:sub(i, i) ~= '[' then parse_error("expected [") end
    i = i + 1
    skip_ws()
    local arr = {}
    if s:sub(i, i) == ']' then i = i + 1; return arr end
    while true do
      local v = parse_value()
      table.insert(arr, v)
      skip_ws()
      local c = s:sub(i, i)
      if c == ',' then
        i = i + 1
        skip_ws()
      elseif c == ']' then
        i = i + 1
        return arr
      else
        parse_error("expected , or ]")
      end
    end
  end

  local function parse_object()
    if s:sub(i, i) ~= '{' then parse_error("expected {") end
    i = i + 1
    skip_ws()
    local obj = {}
    if s:sub(i, i) == '}' then i = i + 1; return obj end
    while true do
      skip_ws()
      local k = parse_string()
      skip_ws()
      if s:sub(i, i) ~= ':' then parse_error("expected :") end
      i = i + 1
      skip_ws()
      obj[k] = parse_value()
      skip_ws()
      local c = s:sub(i, i)
      if c == ',' then
        i = i + 1
        skip_ws()
      elseif c == '}' then
        i = i + 1
        return obj
      else
        parse_error("expected , or }")
      end
    end
  end

  parse_value = function()
    skip_ws()
    local c = s:sub(i, i)
    if c == '"' then return parse_string()
    elseif c == '{' then return parse_object()
    elseif c == '[' then return parse_array()
    elseif c == 't' then return parse_literal("true", true)
    elseif c == 'f' then return parse_literal("false", false)
    elseif c == 'n' then return parse_literal("null", nil)
    else
      return parse_number()
    end
  end

  skip_ws()
  local v = parse_value()
  skip_ws()
  return v
end

local function to_int(v, fallback)
  local n = tonumber(v)
  if n == nil then return fallback end
  return math.floor(n)
end

local function set_track_name(track, name)
  if not track then return end
  reaper.GetSetMediaTrackInfo_String(track, "P_NAME", tostring(name or ""), true)
end

local function set_track_color(track, color)
  if not track or not color then return end
  local r, g, b = nil, nil, nil
  if type(color) == "table" then
    if color[1] and color[2] and color[3] then
      r, g, b = to_int(color[1], 0), to_int(color[2], 0), to_int(color[3], 0)
    elseif color.r and color.g and color.b then
      r, g, b = to_int(color.r, 0), to_int(color.g, 0), to_int(color.b, 0)
    end
  end
  if r and g and b then
    local native = reaper.ColorToNative(r, g, b) | 0x1000000
    reaper.SetTrackColor(track, native)
  end
end

local function set_track_arm_monitor(track, arm, monitor)
  if not track then return end
  if arm ~= nil then reaper.SetMediaTrackInfo_Value(track, "I_RECARM", arm and 1 or 0) end
  if monitor ~= nil then reaper.SetMediaTrackInfo_Value(track, "I_RECMON", monitor and 1 or 0) end
end

local function set_track_midi_input(track, midiChannel)
  if not track then return end
  -- REAPER record input: MIDI uses 4096 + channelIndex (0=omni, 1..16 -> 0..15)
  local base = 4096
  if midiChannel ~= nil then
    local ch = tonumber(midiChannel)
    if ch and ch >= 1 and ch <= 16 then
      reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", base + (ch - 1))
      return
    end
  end
  reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", base)
end

local function add_fx_best_effort(track, pluginName, pluginFormatHint)
  if not track or not pluginName or pluginName == "" then return -1, "" end
  local queries = {}
  local hint = tostring(pluginFormatHint or "")
  if hint == "VST3" then
    table.insert(queries, "VST3i: " .. pluginName)
    table.insert(queries, "VST3: " .. pluginName)
  elseif hint == "AU" then
    table.insert(queries, "AUi: " .. pluginName)
    table.insert(queries, "AU: " .. pluginName)
  else
    table.insert(queries, "VST3i: " .. pluginName)
    table.insert(queries, "VST3: " .. pluginName)
    table.insert(queries, "AUi: " .. pluginName)
    table.insert(queries, "AU: " .. pluginName)
  end
  table.insert(queries, pluginName)

  for _, q in ipairs(queries) do
    local fxIndex = reaper.TrackFX_AddByName(track, q, false, -1)
    if fxIndex ~= nil and fxIndex >= 0 then
      return fxIndex, q
    end
  end

  return -1, ""
end

local resource = reaper.GetResourcePath()
local bridge_dir = resource .. "/ATLAS/bridge"
local in_path = bridge_dir .. "/in.txt"
local out_path = bridge_dir .. "/out.txt"

ensure_dir(bridge_dir)

local last_input = nil

local function write_ack(id, ok, msg, extra)
  extra = extra or {}
  local lines = {}
  table.insert(lines, "lastId=" .. (id or ""))
  table.insert(lines, "ok=" .. (ok and "1" or "0"))
  table.insert(lines, "message=" .. (msg or ""))
  table.insert(lines, "lastSeenAt=" .. tostring(now_ms()))
  table.insert(lines, "bridgeReady=1")
  table.insert(lines, "bridgeVersion=" .. BRIDGE_VERSION)

  for k, v in pairs(extra) do
    table.insert(lines, tostring(k) .. "=" .. tostring(v))
  end

  write_file(out_path, table.concat(lines, "\n") .. "\n")
end

local function list_fx_names(track)
  local out = {}
  local fx_count = reaper.TrackFX_GetCount(track)
  for i = 0, fx_count - 1 do
    local retval, fx_name = reaper.TrackFX_GetFXName(track, i, "")
    if retval and fx_name and fx_name ~= "" then
      table.insert(out, fx_name)
    end
  end
  return out
end

local function find_fx_on_track(track, plugin_name)
  local fx_count = reaper.TrackFX_GetCount(track)
  for i = 0, fx_count - 1 do
    local retval, fx_name = reaper.TrackFX_GetFXName(track, i, "")
    if retval and ci_contains(fx_name, plugin_name) then
      return i, fx_name
    end
  end
  return -1, ""
end

local function find_fx_anywhere(plugin_name)
  local matches = {}
  local track_count = reaper.CountTracks(0)
  for t = 0, track_count - 1 do
    local track = reaper.GetTrack(0, t)
    if track then
      local fxIndex, fxActualName = find_fx_on_track(track, plugin_name)
      if fxIndex >= 0 then
        table.insert(matches, { trackIndex = t, fxIndex = fxIndex, fxName = fxActualName })
      end
    end
  end
  return matches
end

local function handle_command(cmd)
  local id = cmd["id"] or ""
  local command = cmd["command"] or ""

  if command == "ping" then
    write_ack(id, true, "pong")
    return
  end

  if command == "load_patch" then
    local trackIndex = tonumber(cmd["trackIndex"] or "-1") or -1
    local pluginName = cmd["pluginName"] or ""
    local presetName = cmd["presetName"] or ""
    local patchId = cmd["patchId"] or ""

    if pluginName == "" then
      write_ack(id, false, "Missing pluginName")
      return
    end

    local track = nil
    local fxIndex = -1
    local fxActualName = ""

    if trackIndex >= 0 then
      track = reaper.GetTrack(0, trackIndex)
      if not track then
        write_ack(id, false, "Track not found", { trackIndex = trackIndex })
        return
      end
      fxIndex, fxActualName = find_fx_on_track(track, pluginName)
    end

    if fxIndex < 0 then
      local matches = find_fx_anywhere(pluginName)
      if #matches == 1 then
        trackIndex = matches[1].trackIndex
        fxIndex = matches[1].fxIndex
        fxActualName = matches[1].fxName
        track = reaper.GetTrack(0, trackIndex)
      elseif #matches > 1 then
        local parts = {}
        for i = 1, math.min(#matches, 6) do
          table.insert(parts, string.format("T%d:%s", matches[i].trackIndex + 1, matches[i].fxName))
        end
        write_ack(id, false, "Plugin found on multiple tracks. Specify correct trackIndex. Matches: " .. table.concat(parts, " | "), {
          pluginName = pluginName
        })
        return
      else
        local hint = ""
        if trackIndex >= 0 and track then
          local fxNames = list_fx_names(track)
          if #fxNames > 0 then
            hint = " FX on that track: " .. table.concat(fxNames, " | ")
          end
        end
        write_ack(id, false, "Plugin not found on track." .. hint, { trackIndex = trackIndex, pluginName = pluginName })
        return
      end
    end

    if presetName ~= "" then
      local _rvBefore, beforeName = reaper.TrackFX_GetPreset(track, fxIndex, "")
      if not beforeName then beforeName = "" end

      reaper.TrackFX_SetPreset(track, fxIndex, presetName)

      local _rvAfter, afterName = reaper.TrackFX_GetPreset(track, fxIndex, "")
      if not afterName then afterName = "" end

      -- If the FX preset name didn't become the requested name, this preset likely doesn't exist
      -- in REAPER's FX preset list for this plugin instance.
      if string.lower(afterName) ~= string.lower(presetName) then
        write_ack(id, false,
          "Preset not found in REAPER FX presets for this plugin. Save a REAPER preset named '" .. presetName .. "' (FX window preset dropdown) and try again.",
          {
            trackIndex = trackIndex,
            pluginName = pluginName,
            fxName = fxActualName,
            requestedPreset = presetName,
            beforePreset = beforeName,
            afterPreset = afterName,
            patchId = patchId
          }
        )
        return
      end
    end

    write_ack(id, true, "patch_loaded", {
      trackIndex = trackIndex,
      pluginName = pluginName,
      fxName = fxActualName,
      presetName = presetName,
      patchId = patchId
    })
    return
  end

  if command == "build_session" then
    local jsonPath = cmd["jsonPath"] or ""
    local replaceExisting = (cmd["replaceExisting"] == "1")
    local append = (cmd["append"] ~= "0")

    if jsonPath == "" then
      write_ack(id, false, "Missing jsonPath for build_session")
      return
    end

    local jsonText = read_file(jsonPath)
    if not jsonText or jsonText == "" then
      write_ack(id, false, "Could not read JSON payload file: " .. jsonPath)
      return
    end

    local payload = nil
    local okParse, parseErr = pcall(function()
      payload = json_decode(jsonText)
    end)
    if not okParse or not payload then
      write_ack(id, false, "Invalid JSON payload: " .. tostring(parseErr))
      return
    end

    if type(payload) ~= "table" or type(payload.tracks) ~= "table" then
      write_ack(id, false, "Payload missing tracks[]")
      return
    end

    reaper.Undo_BeginBlock()
    reaper.PreventUIRefresh(1)

    local errors = {}
    local warnings = {}
    local createdTracks = 0
    local insertedFX = 0
    local appliedPresets = 0

    -- Optionally wipe tracks
    if replaceExisting then
      for ti = reaper.CountTracks(0) - 1, 0, -1 do
        local tr = reaper.GetTrack(0, ti)
        if tr then reaper.DeleteTrack(tr) end
      end
    end

    local startIndex = 0
    if (not replaceExisting) and append then
      startIndex = reaper.CountTracks(0)
    end

    for idx = 1, #payload.tracks do
      local t = payload.tracks[idx]
      local role = tostring(t.role or "TRACK")
      local trackName = tostring(t.trackName or (role .. ""))
      local pluginName = tostring(t.pluginName or "")
      local pluginFormatHint = t.pluginFormatHint
      local presetName = tostring(t.presetName or "")
      local midiChannel = t.midiChannel
      local arm = t.arm
      local monitor = t.monitor

      local trackIndex = startIndex + (idx - 1)
      reaper.InsertTrackAtIndex(trackIndex, true)
      local track = reaper.GetTrack(0, trackIndex)
      createdTracks = createdTracks + 1

      set_track_name(track, trackName)
      set_track_color(track, t.color)
      set_track_arm_monitor(track, arm == true, monitor == true)
      set_track_midi_input(track, midiChannel)

      local fxIndex = -1
      local fxQuery = ""
      if pluginName ~= "" then
        fxIndex, fxQuery = add_fx_best_effort(track, pluginName, pluginFormatHint)
        if fxIndex >= 0 then
          insertedFX = insertedFX + 1
        else
          table.insert(errors, "Track " .. tostring(trackIndex + 1) .. " (" .. role .. "): plugin not found: " .. pluginName)
        end
      else
        table.insert(warnings, "Track " .. tostring(trackIndex + 1) .. " (" .. role .. "): missing pluginName")
      end

      -- Preset recall (best-effort)
      if fxIndex >= 0 then
        if t.fxChunkBase64 and tostring(t.fxChunkBase64) ~= "" then
          table.insert(warnings, "Track " .. tostring(trackIndex + 1) .. ": fxChunkBase64 not supported yet (skipped)")
        elseif presetName ~= "" then
          local _rvBefore, beforePreset = reaper.TrackFX_GetPreset(track, fxIndex, "")
          if not beforePreset then beforePreset = "" end
          reaper.TrackFX_SetPreset(track, fxIndex, presetName)
          local _rvAfter, afterPreset = reaper.TrackFX_GetPreset(track, fxIndex, "")
          if not afterPreset then afterPreset = "" end
          if string.lower(afterPreset) == string.lower(presetName) then
            appliedPresets = appliedPresets + 1
          else
            table.insert(warnings, "Track " .. tostring(trackIndex + 1) .. ": preset not found in REAPER FX presets: " .. presetName)
          end
        else
          table.insert(warnings, "Track " .. tostring(trackIndex + 1) .. ": no presetName (left default)")
        end
      end
    end

    reaper.PreventUIRefresh(-1)
    reaper.Undo_EndBlock("ATLAS Pro: Build session from Genre Kit", -1)

    local msg = "Session created: " .. tostring(createdTracks) .. " track(s), " .. tostring(insertedFX) .. " plugin(s), " .. tostring(appliedPresets) .. " preset(s)"
    if #errors > 0 then
      write_ack(id, false, msg .. " (with errors)", {
        createdTracks = createdTracks,
        insertedFX = insertedFX,
        appliedPresets = appliedPresets,
        errors = table.concat(errors, " || "),
        warnings = table.concat(warnings, " || ")
      })
      return
    end

    write_ack(id, true, msg, {
      createdTracks = createdTracks,
      insertedFX = insertedFX,
      appliedPresets = appliedPresets,
      warnings = table.concat(warnings, " || ")
    })
    return
  end

  if command == "save_patch" then
    local trackIndex = tonumber(cmd["trackIndex"] or "-1") or -1
    local pluginName = cmd["pluginName"] or ""

    if trackIndex < 0 or pluginName == "" then
      write_ack(id, false, "Missing trackIndex/pluginName")
      return
    end

    local track = reaper.GetTrack(0, trackIndex)
    if not track then
      write_ack(id, false, "Track not found", { trackIndex = trackIndex })
      return
    end

    local fxIndex, fxActualName = find_fx_on_track(track, pluginName)
    if fxIndex < 0 then
      local fxNames = list_fx_names(track)
      local hint = ""
      if #fxNames > 0 then
        hint = " FX on that track: " .. table.concat(fxNames, " | ")
      end
      write_ack(id, false, "Plugin not found on track." .. hint, { trackIndex = trackIndex, pluginName = pluginName })
      return
    end

    local retval, presetName = reaper.TrackFX_GetPreset(track, fxIndex, "")
    if not retval then presetName = "" end

    write_ack(id, true, "patch_saved", {
      trackIndex = trackIndex,
      pluginName = pluginName,
      fxName = fxActualName,
      presetName = presetName
    })
    return
  end

  write_ack(id, false, "Unknown command: " .. command)
end

local function loop()
  local content = read_file(in_path)
  if content and content ~= last_input then
    last_input = content
    local cmd = parse_kv(content)
    if cmd and cmd["command"] and cmd["command"] ~= "" then
      local ok, err = pcall(function() handle_command(cmd) end)
      if not ok then
        write_ack(cmd["id"] or "", false, "Bridge error: " .. tostring(err))
      end
    end
  end

  reaper.defer(loop)
end

-- Startup marker so ATLAS can see the bridge is alive even before first command
write_ack("", true, "bridge_started")
loop()

