-- Example Roblox ServerScript (CommandPoller_Roblox.lua)
-- Polls the backend for commands and handles 'restart' by kicking players.
-- Place this in ServerScriptService. Adjust URL and token in the variables below.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Configure these before pasting into ServerScriptService
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
    local base = tostring(API_BASE or ""):gsub("/+$", "")
    if base == "" then
        warn("CommandPoller: API_BASE not configured")
        return
    end
    local url = base .. "/api/commands/after?since=" .. tostring(lastCmdId)

    local ok, result = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = "GET",
            Headers = getHeaders(),
        })
    end)

    if not ok then
        warn("Command poll failed:", result)
        return
    end

    local resp = result
    if not resp.Success then
        warn("Command poll HTTP error:", resp.StatusCode, resp.StatusMessage)
        return
    end

    local parsed = nil
    local success, decoded = pcall(function() return HttpService:JSONDecode(resp.Body) end)
    if success and type(decoded) == "table" then
        parsed = decoded
    else
        -- nothing new or invalid JSON
        return
    end

    for _, cmd in ipairs(parsed) do
        lastCmdId = math.max(lastCmdId, tonumber(cmd.id) or 0)
        if cmd.type == "restart" then
            local reason = (cmd.payload and cmd.payload.reason) and cmd.payload.reason or "Server is restarting"
            warn("CommandPoller: processing restart id=", cmd.id, "reason=", reason)
            for _, plr in ipairs(Players:GetPlayers()) do
                -- attempt safe kick
                pcall(function() plr:Kick(reason) end)
            end
            -- processed restart
        end
    end
end

while true do
    fetchNewCommands()
    wait(POLL_INTERVAL)
end
