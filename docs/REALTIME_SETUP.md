Realtime server & session media (camera, mic, whiteboard)
======================================

Quick guide to get the session page media (camera, mic, whiteboard, screen) working locally and in production.

1) Local development (fast)
- Ensure your `.env` contains these keys (example values kept out of VCS):
  - `SOCKET_JWT_SECRET` (>=16 chars)
  - `SOCKET_INTERNAL_SECRET` (>=16 chars)
  - `SOCKET_SERVER_URL=http://127.0.0.1:3001`
  - `SOCKET_CORS_ORIGINS` (e.g. `http://localhost:3000,http://127.0.0.1:3000`)

- Start Next + local socket sidecar together:
```bash
npm run dev:realtime
```

- Open your app at `http://localhost:3000`. The socket sidecar runs on port `3001` by default and will accept local origins.

2) Browser permissions & testing
- Grant the page microphone permissions when prompted. verify with DevTools -> Application -> Permissions.
- For screen sharing, use a supported browser (Chrome/Edge/Firefox); some browsers restrict audio capture for `getDisplayMedia`.
- Check the Session page UI: toggling Mic should call `navigator.mediaDevices.getUserMedia`, Share screen calls `getDisplayMedia`, and whiteboard uses the socket room.

3) Production checklist (necessary server config)
- Deploy a Socket.IO server (the project includes `scripts/socket-server.ts` intended as a sidecar). Run the same script behind a proper process manager (systemd/pm2) or as a container.
- Required env vars on production:
  - `SOCKET_SERVER_URL` -> e.g. `https://realtime.example.com` (use `wss`/`https` depending on your proxy)
  - `SOCKET_JWT_SECRET` -> same secret used by Next API to sign short-lived tokens
  - `SOCKET_INTERNAL_SECRET` -> secret for internal POST endpoints (`/internal/*`)
  - `SOCKET_CORS_ORIGINS` -> comma list of allowed origins
  - `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` -> JSON array of RTCIceServer objects (include TURN)

Example `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` value (use your TURN provider credentials):
```text
[{"urls":"turn:turn.example.com:3478","username":"turnuser","credential":"turnpass"}]
```

Why TURN matters: STUN alone fails for strict NATs; add a TURN server for reliable audio/video in production.

4) Reverse proxy / TLS
- Terminate TLS at a proxy (nginx, cloud load balancer) and forward WebSocket / Socket.IO traffic to the socket server. Ensure `socketUrl` returned by `/api/v1/realtime/token` matches the public socket endpoint.

5) Secrets & rotation
- Do NOT commit secrets to the repo. Store them in your hosting provider secrets manager (Vercel/Netlify/GCP/Azure) or Vault.
- Rotate `SOCKET_JWT_SECRET` and `SOCKET_INTERNAL_SECRET` if they are leaked.

6) Debugging steps
- Locally: open browser console and observe console logs from `socket-io-provider` connect/connect_error.
- Server side: `npx tsx scripts/socket-server.ts` prints listen address and CORS rejections.
- If media never negotiates: check `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` (TURN) and verify `socketUrl` + token exchange succeed.

7) Quick test sequence
- Start `npm run dev:realtime`
- Open two browser windows (different accounts or incognito), join the same session, enable Mic on both, confirm audio and remote video element receives stream.
- Draw on whiteboard in one client and verify stroke appears in the other.

If you'd like, I can: (A) add a small README snippet to the Session page, (B) add runtime checks that warn users if ICE/Socket config is missing, or (C) wire a TURN provider sample. Which would you prefer?
