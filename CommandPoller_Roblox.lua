-- Example Roblox ServerScript (CommandPoller_Roblox.lua)
-- Polls the backend for commands and handles 'restart' by kicking players.
-- Place this in ServerScriptService. Adjust URL and token in the variables below.

local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local API_BASE = "REPLACE_WITH_YOUR_BACKEND_URL" -- e.g. https://your-railway-app.up.railway.app
local TOKEN = "REPLACE_WITH_TOKEN_IF_USED" -- BAN_TOKEN / ROBLOX_API_KEY if set

local lastCmdId = 0
local POLL_INTERVAL = 3 -- seconds

local function getHeaders()
    local headers = { ["Content-Type"] = "application/json" }
    if TOKEN and TOKEN ~= "" then
        headers["Authorization"] = "Bearer " .. TOKEN
    end
    return headers
end

local function fetchNewCommands()
    local url = API_BASE:gsub("/+$", "") .. "/api/commands/after?since=" .. tostring(lastCmdId)
    local ok, resp = pcall(function() return HttpService:GetAsync(url, true, getHeaders()) end)
    if not ok then
        warn("Command poll failed:", resp)
        return
    end
    local parsed = nil
    local success, decoded = pcall(function() return HttpService:JSONDecode(resp) end)
    if success and type(decoded) == "table" then
        parsed = decoded
    else
        return
    end
    for _, cmd in ipairs(parsed) do
        lastCmdId = math.max(lastCmdId, tonumber(cmd.id) or 0)
        if cmd.type == "restart" then
            -- Kick all players with a message (optional payload.reason)
            local reason = (cmd.payload and cmd.payload.reason) and cmd.payload.reason or "Server is restarting"
            for _, plr in ipairs(game:GetService("Players"):GetPlayers()) do
                plr:Kick(reason)
            end
            -- Optionally perform instance shutdown / restart logic here
            warn("Processed restart command id=", cmd.id)
        end
    end
end

while true do
    fetchNewCommands()
    wait(POLL_INTERVAL)
end
