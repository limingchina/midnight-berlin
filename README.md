# MIDNIGHT / BERLIN

A GTA-inspired, original single-car driving prototype on real Berlin streets. No GTA assets, branding, or game code are used.

**Play:** https://midnight-berlin.inetdragon.chatgpt.site (owner-private Site)

## Features

- Real OpenFreeMap / OpenStreetMap vector streets and building footprints, centered on Unter den Linden, Berlin Mitte.
- Original procedural **Phantom GT** sports coupe, four paint colors, visible steering pivots and wheel rotation, cosmetic body lean, tail lights and underglow.
- Fixed 120 Hz arcade dynamics: acceleration, braking, reverse, steering, rear-wheel drift, nitro with recharge, wall restitution and cosmetic body wear.
- Nearby building polygons shared by the renderer and collision solver, including open courtyard holes. Three-circle vehicle capsule approximation; edge resolution and bounded fixed steps reduce tunneling.
- Two real three.js spotlights light three.js building facades. Additive cone meshes make headlight columns visible, with raycasts shortening both beams and ground pools at nearby walls. Spotlights cast shadows on the custom buildings.
- Night/day schemes, headlight switch, three chase/wide/top-down camera views, minimap, speed/gear/boost HUD, keyboard and simultaneous pointer controls.
- Opt-in synthesized engine sound. No tracking, backend, API key, account linking, or purchases.

## Run locally

Node 20+ is needed only for tests. The app itself is buildless.

```sh
python3 -m http.server 8080 --directory dist
# open http://localhost:8080
npm test
```

Use an HTTP server; ES modules cannot run from file://. Map tiles, styles and optional Google Fonts need an internet connection. MapLibre and Three.js are vendored in `dist/vendor/`, with their original licenses.

## Controls

| Input | Action |
| --- | --- |
| W / Up | Accelerate |
| S / Down | Brake, then reverse |
| A / D or Left / Right | Steer (front wheels animate even while stationary) |
| Space | Handbrake drift |
| Shift | Nitro |
| C | Cycle cameras |
| L | Toggle headlights |
| R | Reset to the road |

On touchscreens, hold steering and pedals with separate fingers. Pointer cancellation, focus loss and document hiding clear held controls.

## Architecture

- `dist/app.js` — MapLibre lifecycle, vector feature ingestion, shared WebGL three.js layer, UI, camera and minimap.
- `dist/scene.js` — procedural car, polygon extrusion, headlight materials and scene assets.
- `dist/physics.js` — pure, deterministic metre-space vehicle and polygon collision math.
- `tests/` — Node physics and real Three.js geometry checks (canvas drawing stub; no GPU emulation).

The shared WebGL canvas remains owned by MapLibre: the Three.js renderer never resizes it or applies a second device pixel ratio. A small local metre coordinate system is multiplied into MapLibre's view-projection in JavaScript double precision. The custom 3D layer follows **all ground layers**, before trailing labels, avoiding roads drawing through buildings in the night style.

Building geometry streams from loaded vector tiles, deduplicated by extent; distant geometry is pruned. Missing building heights use approximate 14–23 m defaults. Car and shader resources persist across day/night changes; the map style is recolored without replacing the world.

## Scope and verification

This is the first playable prototype, not a complete GTA game. No pedestrians, traffic, interiors, missions, deformable meshes, terrain/bridge driving, police, or multiplayer. Ground is flat at z=0; bridges and water have no special collision. Building colliders cover streamed footprints, not facade details. Beam meshes are an inexpensive visual approximation rather than volumetric ray marching; the map's own ground shader is not lit by Three.js, so light pools are additive overlays. Cosmetic wear does not deform the car.

11 automated physics/geometry tests pass. Spawn coordinates were checked against the live OpenFreeMap tile road geometry. Browser visual verification and device performance measurement were blocked by the managed preview infrastructure (`bwrap` could not mount `/proc`). Phone rendering and GPU shader execution are therefore unverified.

## Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), distributed via [OpenFreeMap](https://openfreemap.org/). MapLibre GL JS uses its BSD license; Three.js uses MIT. Original source is supplied without an additional license grant at this stage. See `dist/vendor/*LICENSE.txt` for dependency licenses.
