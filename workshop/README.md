# Collaborator local workshop

This first connector makes primitive 3D blockouts with a local Ollama model and Blender. It is not a general Blender agent or an Unreal connector.

## Windows setup

1. Right-click **Install prerequisites.ps1** and choose **Run with PowerShell**, or install Blender, Ollama, and Python 3.10+ from their official websites. The helper asks before installing. Downloads require several GB of storage and internet access.
2. Restart Ollama after setup. Its `OLLAMA_NO_CLOUD=1` setting disables cloud inference. In a new terminal run `ollama pull qwen3:8b`. A smaller local model may be needed on other computers.
3. Double-click **Start workshop.cmd**, tick the local-access consent box, and choose **Start workshop** in the control window. If Blender is installed in a custom location, set `BLENDER_PATH` to its executable before starting.
4. Open Collaborator's workshop page, use **Copy pairing code** in the control window and paste the code, and connect. Allow local-network access if the browser asks. If an embedded browser blocks it, use a regular browser.
5. Choose a local model, describe a blockout, and run. Inspect the preview before sharing. The website never receives the pairing code except as an in-memory local connection credential; it is sent only to the loopback companion.

## Boundaries

- One job at a time. A model request times out after four minutes; total adapter execution is capped at eight minutes. A stop during inference is cooperative: the current request may finish before the stop is observed. No new render starts after cancellation.
- No generated Python is executed. The model supplies validated JSON with up to 48 primitive shapes. The trusted adapter creates geometry, camera, lighting, `.blend`, and a PNG preview. There is no arbitrary command, file, plugin, or network operation in the scene schema.
- Local jobs are retained in `runs/`. A restart marks interrupted jobs as stopped. Limit: 100 retained local runs. Archive old runs yourself before reaching this cap.
- Artifacts up to 10 MB can be transferred from the companion. Shared results have a separate 100 MB per-person pilot quota. Sharing is a deliberate upload to the mission; local generation alone uploads nothing.
- The website records shared outputs, model names, instructions, and acceptance. Acceptance writes a content-hashed artifact reference to mission Git. Binary assets remain in object storage.
- The companion is bound to `127.0.0.1:8765`, requires an exact allowed Origin and Host, and a random per-launch pairing secret. Do not expose it through a public tunnel.

Official references: https://docs.ollama.com/capabilities/structured-outputs, https://docs.ollama.com/faq, https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html

## Mission tool connections (companion v3)

Use the mission's workshop to declare required tools and select an available operation. Blender and Unreal are defaults only for Mahabharata. API-only missions do not require Blender or Ollama. Python is needed for the local companion; Windows users can use Start workshop, while other systems can run `python3 companion.py` (not tested here).

In Connect an HTTP API, enter a connection ID matching the mission requirement, a name, and a fixed HTTPS JSON URL (HTTP is permitted for loopback APIs). An optional bearer token is stored only in `.local-connectors.json` beside this companion. Protect that file as a credential file. Never publish it. Connections are fixed GET operations; the brief is a run note, not agent instructions for changing the endpoint. Responses are capped at 1 MB with no redirects. Downloaded data can be shared for mission review.

New Blender runs include artifact.glb as well as artifact.blend. Existing runs remain unchanged.

## Local control window

The control window starts stopped and requires consent on each start. Stop workshop blocks new jobs, cancels active work, and waits for it to finish before closing the local server. During model inference this can take up to four minutes; fixed API reads time out after 30 seconds. Closing asks before stopping. Local results remain on disk, and every restart creates a fresh pairing code.

A second launch cannot replace an existing workshop. Stop the earlier window (or command-line companion) first. After a PC restart, open Start workshop again and pair with the new code. No automatic login startup is installed. The command-line `python companion.py` path remains available for advanced users.

This is a Python control window, not a signed installer. Windows lifecycle and consent tests pass; macOS/Linux packaging and browser permission flows still require testing.

## AI work planning
Open a claimed task from the mission task board to generate work for that task. The companion preserves its task revision and mission text snapshot in inputs.json. Blender generation receives bounded reference excerpts, saved as context-used.txt. These files are included in the result bundle. Workspace filenames stay JSON data; they are never extracted or executed. Binary assets are not automatically imported. Sharing sends the task for review; requested changes require a new run against the refreshed task revision. Runs from other tasks cannot be used as revision parents. Updating the complete companion folder, including inputs.py, is required.

The mission planning page uses the mission-planner capability to request a bounded JSON plan from local Ollama. It needs no Blender or Unreal installation. Generation does not run the proposed tasks. Edit the draft, submit it, and wait for mission-lead approval. Update this entire folder when upgrading: planner.py is required by companion.py.
