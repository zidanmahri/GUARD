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

    -- Try to decode body
    local parsed = nil
    local success, decoded = pcall(function() return HttpService:JSONDecode(resp.Body) end)
    if success and type(decoded) == "table" and #decoded > 0 then
        parsed = decoded
    else
        -- nothing new in /after; attempt a single /latest fallback to diagnose
        warn("CommandPoller: /api/commands/after returned empty or invalid. Trying /api/commands/latest for debugging.")
        local ok2, res2 = pcall(function()
            return HttpService:RequestAsync({
                Url = base .. "/api/commands/latest",
                Method = "GET",
                Headers = getHeaders(),
            })
        end)
        if not ok2 then
            warn("CommandPoller: /latest request failed:", res2)
            return
        end
        if not res2.Success then
            warn("CommandPoller: /latest HTTP error:", res2.StatusCode, res2.StatusMessage, res2.Body)
            return
        end
        local ok3, decodedLatest = pcall(function() return HttpService:JSONDecode(res2.Body) end)
        if ok3 and type(decodedLatest) == "table" then
            parsed = { decodedLatest }
            warn("CommandPoller: /latest returned a command (id=", tostring(decodedLatest.id), ").")
        else
            warn("CommandPoller: /latest returned no command or invalid JSON:", res2.Body)
            return
        end
    end

    for _, cmd in ipairs(parsed) do
        local cid = tonumber(cmd.id) or 0
        if cid > lastCmdId then
            if cmd.type == "restart" then
                local reason = (cmd.payload and cmd.payload.reason) and cmd.payload.reason or "Server is restarting"
                warn("CommandPoller: processing restart id=", cmd.id, "reason=", reason)
                for _, plr in ipairs(Players:GetPlayers()) do
                    -- attempt safe kick
                    pcall(function() plr:Kick(reason) end)
                end
                -- processed restart: ack the command to backend so it won't be re-delivered
                local ackOk, ackRes = pcall(function()
                    return HttpService:RequestAsync({
                        Url = base .. "/api/commands/" .. tostring(cmd.id) .. "/ack",
                        Method = "POST",
                        Headers = getHeaders(),
                        Body = HttpService:JSONEncode({ processedBy = "roblox-server" })
                    })
                end)
                if not ackOk then
                    warn("CommandPoller: ack request failed:", ackRes)
                else
                    if not ackRes.Success then
                        warn("CommandPoller: ack HTTP error:", ackRes.StatusCode, ackRes.StatusMessage, ackRes.Body)
                    else
                        warn("CommandPoller: ack succeeded for id=", tostring(cmd.id))
                    end
                end
            else
                warn("CommandPoller: unknown command type=", tostring(cmd.type), "id=", tostring(cmd.id))
            end
            lastCmdId = cid
        else
            warn("CommandPoller: skipping already-processed command id=", cid)
        end
    end
end

while true do
    fetchNewCommands()
    wait(POLL_INTERVAL)
end
