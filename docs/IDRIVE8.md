# iDrive 8 compatibility investigation

Status: research branch only. No shipping game metadata or game code is changed. All four games remain ID7-only. Checked 2 November 2026 against game commit `e6671d3b44839b17a5596bb2c24b3b7eed857961`, local Store commit `eb5bcc47ef9c620a5e69e50119a58e0027af1e2f`, and the current upstream sources linked below.

## Findings

| Area | Current games | ID8 route |
| --- | --- | --- |
| Rules, score storage, fonts | Platform-independent JavaScript; same drawing protocol | Reuse |
| App eligibility | `mguHmi: ["ID7"]` in repository manifest, release settings and staged package | Add ID8 only after the integration works |
| RHMI descriptions | ID7 WelcomeApp template and three named states | ID8 Wide List host states with matching names, IDs, status cells and title fields |
| Renderer | Hard requirement for `embed` | Negotiate `layer` using the renderer's reported `appArea`; embed is not offered on ID8 |
| Gameplay input | Only renderer `ccu` events; no touch handlers or claims | Add touch controls and menu/initials hit testing; retain controller only when genuinely available |
| Controller capture | Requires renderer `info.controller` | Raw wheel/tilt capture is not established on ID8; native menu buttons are a different input route |
| Navigation | Nested native states implement Back; focus controls visibility and capture | Verify the ID8 host-state events, foreground gating, Home, Back and popups |
| Install lifecycle | Head-unit SDK linking, existing persistent app data | Link on the ID8 unit; verify install/restart, relaunch, updates and saves |

The largest practical obstacle is input. The renderer's `CAP_CONTROLLER` flag is not simply a declaration of a physical knob: the current code checks that the configured HMI process has the `mgu-inputgate` library loaded and that the event socket is free. The existing hook is documented and implemented around `HmiMain3D` and a particular CommonAPI/SomeIP symbol. The ID8 HMI is different. This is no evidence that changing a process name or loading that library into ID8 would work. No HMI hook or system configuration was changed during this investigation.

The Store demonstrates layer-mode ID8 rendering and native focus/button proxies for menus. Its direct FrontCCU fallback is limited to its embed host. Thus the Store working on ID8 does not establish raw steering input for these games. Reading FrontCCU directly would also need safe suppression of the HMI's competing reactions before it could replace capture.

## Reproduced locally

Run `node tools/id8_research.js`. It loads the unchanged adapter of every game with mocked SDK and renderer objects, with real game sessions and drawing modules. No BMW SDK or saved user data is loaded.

| Synthetic renderer capabilities | All four current adapters |
| --- | --- |
| ID7-style embed + controller | Ready, drawing, controller requested |
| ID8-style layer + touch, no controller | Not ready, not drawing, no capture |
| Layer + controller | Still not ready because embed is required |

The script also checks a proposed, isolated host-selection policy: prefer embed, otherwise layer; require controller or touch; reject invalid geometry and absent input. It is not wired into any shipping app. This exercise establishes the current application-side blockers and the placement arithmetic, not ID8 runtime compatibility.

For the documented example `appArea = {x:0,y:76,w:2880,h:764}`, the existing 1280x480 design fits at scale 1.5917 with 421.33px horizontal inset and no vertical inset. That geometry is an example, not a device constant: always use the capability reply. A future touch toolbar can use a revised logical layout; input and claims must follow the final layout.

An Ubuntu WSL distribution is available on this workstation. QEMU, Docker, Lima and an existing MGU emulator checkout were not found in the locations checked. No ID8 emulator, head-unit firmware or physical vehicle was exercised.

## Recommended port: 2048 first, touch-first

1. Add a small common host policy to the app build inputs, preserving embed + controller on ID7 and selecting layer + touch on ID8. Choose the mode before showing the surface. Distinguish unavailable display from unavailable input in status messages.
2. Add ID8 RHMI XML/JSON host states using the Store's ID8 conventions. Keep root/menu/detail semantics and resource UUIDs stable across updates. Verify actual SDK calls and status-cell names on ID8; merely duplicating the ID7 JSON is insufficient.
3. Add touch to 2048: board swipes for moves; visible pause control; tappable menu rows; accessible letter selection and confirmation for high-score names. Use the renderer's logical touch coordinates and claim only the game's interactive region. Release claims on hide/exit/disconnect. Keep native Home and Back reachable.
4. Exercise the full app in an ID8 head-unit emulator: install through Store, open from app list, play, pause, navigate back, exit, reopen and restart. Test missing renderer, unavailable touch, reconnect, interrupted swipes and foreground changes. Compare ID7 on the same branch.
5. Verify on a parked ID8 car before advertising that variant as supported. Collect renderer modes/capabilities, viewport, touch results, native state events and save behavior; exclude identifying vehicle data and credentials from the repository.
6. Reuse the verified host and menu/initials input layer for the other games. Then expand `mguHmi` consistently in the branch manifest, release settings, package metadata and RHMI resources, and release updated versions with an appropriate renderer requirement.

| Game | Proposed touch gameplay |
| --- | --- |
| 2048 | Swipe board to slide; tap pause/menu controls |
| Minesweeper | Tap a cell; visible Reveal/Flag selector and pause control; larger expert-board hit targets or a viewport if necessary |
| Snake | Two large relative-turn buttons, plus pause; preserve wheel steering where capture is available |
| Tetris | Left/right buttons, rotation, soft/hard drop and pause; explicit repeat/cancel rules for held controls |

Touch controls need distinct mappings: a swipe handler alone will not cover all four games. Timed games must pause on focus loss, and no gesture or held button may remain active after navigation.

## Rotary-preserving alternative

Investigate the ID8 HMI's own input/SDK route and existing native control proxies first. If exclusive raw controller capture requires a new renderer/HMI integration, that is separate platform work with its own runtime validation. Do not preload the ID7 hook into ID8 or grant broad input claims based only on symbol similarity. Add and test a dependency requirement if a new renderer capability is needed.

Native menu navigation may be reusable without an exclusive game-controller gate, but it does not by itself provide the wheel deltas and directional tilt behavior needed by Snake or Tetris. This route should not block the touch-first port.

## Acceptance before publishing ID8 support

- All games can be installed and opened with the head unit's own SDK, with their padded icons and correct title/resources.
- Layout remains within the renderer's app area, with HMI controls visible and reachable.
- Gameplay, menus, confirmations, score-name entry and exit can be completed through supported input alone.
- Input and display release correctly on Back/Home, popups, focus loss, disconnect and application shutdown.
- Board and score data survive relaunch, reboot and upgrade; ID7 regression checks pass.
- Emulator findings and parked-car findings are recorded separately. An ID8.5 or other variant is not implied by an ID8 result.

## Primary evidence

- [Renderer settings: ID7/ID8 modes and geometry](https://github.com/robertnisipeanu/mgu-store/blob/main/native/mgu-render/README.md#settings)
- [Renderer capability handshake and controller library check](https://github.com/robertnisipeanu/mgu-store/blob/main/native/mgu-render/src/main.c): `hello`, `ctl_gate_loaded`, `ccu_read`.
- [Existing controller hook](https://github.com/cauliflowermossgrape/idrive7-apps/blob/main/kit/renderd/inputgate/mgu-inputgate.cpp)
- [Store host negotiation and input proxies](https://github.com/robertnisipeanu/mgu-store/blob/main/apps/robertn_store/src/store_drawn.js)
- [Store FrontCCU setup](https://github.com/robertnisipeanu/mgu-store/blob/main/apps/robertn_store/src/store.js): `_setupController`.
- [ID8 foreground detection](https://github.com/robertnisipeanu/mgu-store/blob/main/native/mgu-render/js/foreground_gate.js): `RemoteHmiApplication2` and `oap-mainapp21`.
- Local games: each `src/iabadia_*.js`, `release.json`, `mgu-app.json`, staged `package.json` and `rhmiData/application.json`.

Upstream links can change. Confirm the target firmware and current renderer/SDK behavior before implementing platform-specific hooks.
