# iDrive 8 support — feature branch

All four games have a dual-platform 0.2.0 implementation on `feature/idrive8-support`. The default `main` branch remains unchanged. These packages are prepared and tested locally under the assumption that ID8 supplies the same controller inputs as ID7: clockwise/counterclockwise wheel movement, four directional tilts and center press. No ID8 emulator or car validation has been performed.

## Rendering and native pages

`shared/platform.js` chooses a renderer host from the capability reply. ID7 prefers `embed`, with `layer` as a fallback; ID8 uses `layer`. Geometry comes from `embedBox` or `appArea`, never a fixed screen resolution. The existing 1280x480 game drawing is scaled uniformly and centered in that box. Layer surfaces hide when their native page loses focus; embed keeps the established ID7 behavior.

Each package contains ID7 and ID8 XML/JSON RHMI descriptions for the same root/menu/detail state names. ID8 uses `LT_State_Wide_List` and `LT_ScrollLabel`; its root title marker selects the platform path. Both platforms share the same icon, strings, UUIDs, game rules, menus and score storage. ID8 service declarations include the `remote2`, `entrypoint2` and `resourcemanagement2` interfaces. Package, release and source-manifest HMI declarations agree.

## Controller routing

| Available input | Source |
| --- | --- |
| Renderer advertises `controller` | Existing renderer `ccu` event stream and exclusive GRAB request |
| ID8 without renderer capture | Direct SDK `FrontCCU.statusRotaryEncoderState` subscription, instance 1 |
| ID7 without renderer capture | Existing controller-required status; gameplay stays inactive |

The direct path converts numeric or named SDK enums into the same `knob`, `press` and `tilt` values used by the game sessions. Those sessions preserve wheel direction, wraparound handling and held-input suppression. Only one input source acts at a time, and samples are ignored while the game is hidden or inactive. Subscriptions are released at shutdown, including a subscription that finishes after shutdown. An unavailable subscription leaves gameplay inactive; reopening retries it.

**Receiving inputs is the branch's working assumption. Direct subscription does not establish exclusive capture.** The current renderer's capture hook targets ID7's `HmiMain3D`; direct FrontCCU does not silence the ID8 HMI. Native focus movement or other BMW reactions could still compete with gameplay. This must be checked in the target runtime before merging. No HMI injection, system configuration changes or new renderer hooks are included.

Controls, pause menus, high-score name entry and game save formats are unchanged. Touch-only gameplay is outside this implementation.

## Local verification

```sh
npm test
npm run build
npm run size
npm run check
```

`tools/test_platform.js` uses mocked SDK objects with real game sessions and drawing code. For every game it exercises ID7 renderer input, ID8 renderer input and ID8 direct FrontCCU: all directional tilts, both wheel directions, center, held-input suppression, menus, native Back, focus loss, exit, reconnect and input-source handover. It checks dual-platform metadata/resources, geometry and unavailable-input behavior. Separate socket tests exercise both embed and ID8-style layer capability replies, including the real renderer client's parsing, fonts, frame submission and input messages.

`tools/id8_research.js` runs that same platform suite. The baseline investigation was superseded by the implementation; it is no longer a probe that expects ID8 to fail.

The platform helper is copied from `shared/platform.js` into each package by `tools/sync_platform.js` as part of `npm run build`. Tests require all packaged copies to match it. No BMW SDK, firmware files or linked application bundles are committed.

The four source packages remain below the existing 512 KiB compressed / 1 MiB unpacked budget. See [app sizes](APP_SIZES.md).

## Before merge

1. Link and launch every game with the ID8 unit's SDK. Confirm native host-state names, title/status resources and entry point registration.
2. Confirm the renderer reports a usable layer viewport, and that scaling respects native title bars, Back, Home and popups.
3. Confirm raw wheel/tilt/press events arrive through a supported source, including named enum values and counter wraparound. Check that BMW does not react to gameplay inputs. If it does, resolve input capture before merging.
4. Complete gameplay, pause menus, confirmations, high-score initials and exit using only the physical controller.
5. Check focus loss and reconnect during timed games, reopening after exit, and save persistence through reboot and upgrade.
6. Run the ID7 regression path and record ID8 emulator and parked-car findings separately. An ID8 result does not automatically establish ID8.5 or other platform variants.

There is no ID8 car available for this work. The checked local Ubuntu WSL environment has no configured MGU emulator. Mock and socket tests are development evidence, not a substitute for those runtime checks. No head-unit install is performed by the local tests.

## Primary platform references

- [Renderer modes and ID8 geometry](https://github.com/robertnisipeanu/mgu-store/blob/main/native/mgu-render/README.md#settings)
- [Renderer capability handshake and controller library check](https://github.com/robertnisipeanu/mgu-store/blob/main/native/mgu-render/src/main.c): `hello`, `ctl_gate_loaded`, `ccu_read`.
- [Store SDK FrontCCU subscription](https://github.com/robertnisipeanu/mgu-store/blob/main/apps/robertn_store/src/store.js): `_setupController`.
- [Controller enum definitions](https://github.com/cauliflowermossgrape/idrive7-apps/blob/main/apps/doom/controls.js)
- [Existing HMI capture hook](https://github.com/cauliflowermossgrape/idrive7-apps/blob/main/kit/renderd/inputgate/mgu-inputgate.cpp)

Platform sources were inspected on 2 November 2026. Firmware-specific behavior remains subject to runtime validation.
