# Breach Protocol Unified Design Book

## Quick Navigation
- [Vision](#vision)
- [Build Surfaces](#build-surfaces)
- [Round Rules and Economy](#round-rules-and-economy)
- [Classes and Gun Roster](#classes-and-gun-roster)
- [Map Pack (3 Maps)](#map-pack-3-maps)
- [Shareable Moments and Clipping Pipeline](#shareable-moments-and-clipping-pipeline)
- [Screens and UX Inventory](#screens-and-ux-inventory)
- [Multiplayer, Netcode, and Matchmaking](#multiplayer-netcode-and-matchmaking)
- [Telemetry and Replay Contracts](#telemetry-and-replay-contracts)
- [Concept Art Pack](#concept-art-pack)
- [Data Interfaces](#data-interfaces)
- [Acceptance Scenarios](#acceptance-scenarios)
- [Production Checklist](#production-checklist)

## Vision
`Breach Protocol` is a tactical 5v5 objective FPS centered on clear teamplay, economy timing, and high-shareability highlight moments.

Session targets:
- ranked: 25-35 minutes,
- casual short: 12-18 minutes.

## Build Surfaces
Client modules:
- movement/combat client,
- buy/loadout UX,
- round HUD,
- scoreboard,
- replay timeline,
- clip editor + share panel.

Server modules:
- authoritative hit and objective resolution,
- matchmaking and party service,
- clip render/upload service,
- anti-cheat telemetry collector.

## Round Rules and Economy
Match format:
- 5v5 teams (`Strikers` vs `Wardens`),
- plant/disarm data core or elimination,
- side swap at half,
- first to round cap wins.

Economy equations (v1 defaults):
- round win: 3200,
- round loss: 1900 base,
- loss streak increment: +500 up to 3400 cap,
- plant bonus: +300 team,
- defuse bonus: +300 team,
- survival carry applies for retained gear.

Round phases:
- buy -> live -> post.

## Classes and Gun Roster
### Classes (4)
- `Anchor`: hold-site specialist.
- `Entry`: first-contact breach role.
- `Controller`: spacing and denial utility.
- `Scout`: info and flank disruption.

Class kit constraints:
- one signature utility + one shared utility slot,
- cooldown and charge rules defined in `ClassDefinition` config.

### Gun Roster (12)
Rifles:
- AR-9 Viper, AR-12 Longstep, BR-7 Cutline, VX-4 Helix

SMGs:
- SMG-5 Stitch, SMG-9 Rift, SMG-11 Flicker

Shotguns:
- SG-2 Breach, SG-8 Ember

Marksman:
- DMR-14 Halcyon, DMR-3 Pike

Sidearm:
- P-1 Kestrel

Each weapon requires full stat table in spec files:
- base damage,
- falloff,
- fire rate,
- recoil pattern id,
- movement accuracy penalty,
- economy price.

## Map Pack (3 Maps)
### Helios Yard
- rail-yard macro map,
- contested mid bridge,
- long A rotate, short B collapse path.

### Cathedral Arc
- tighter vertical interior,
- strong utility timing choke points,
- high value flank timing windows.

### Severance Port
- wider sightlines,
- anchor-friendly defense lanes,
- punishable long rotates.

Each map must provide:
- callout list,
- site boundary polygons,
- spawn and fallback zones,
- lane graph for nav and replay tags.

## Shareable Moments and Clipping Pipeline
Pipeline:
1. rolling replay buffer stores last 45 seconds per player,
2. clip trigger from manual hotkey or auto-highlight,
3. clip render worker cuts segment,
4. upload storage + signed URL,
5. optional public URL + share card metadata.

Auto-highlight triggers:
- ace,
- 1vX clutch,
- multikill chain,
- last-second objective save.

Moderation:
- report endpoint,
- visibility flag per clip,
- retention policy by mode.

## Screens and UX Inventory
Required screens:
- main menu,
- matchmaking queue,
- party lobby,
- class/loadout,
- buy panel,
- in-round HUD,
- post-round scoreboard,
- match summary + MVP,
- replay timeline,
- clip editor,
- share panel,
- profile/history,
- settings/keybind/accessibility.

Accessibility baseline:
- subtitle and audio mix controls,
- color-blind utility palette toggles,
- controller remap support.

## Multiplayer, Netcode, and Matchmaking
Netcode model:
- server authoritative,
- client prediction,
- lag compensation for hit validation,
- reconciliation event stream.

Defaults:
- ranked tickrate: 64,
- casual tickrate: 32,
- reconnect grace: 45 seconds.

Matchmaking:
- ranked MMR queue,
- casual broad queue,
- party constraints in ranked.

## Telemetry and Replay Contracts
Core telemetry:
- shot fired, hit confirmed, damage applied,
- ability cast and outcome,
- objective events,
- round economy events,
- reconcile corrections,
- clip create/upload/share events.

Replay contract:
- timeline markers for objective and multikill moments,
- deterministic event ordering via server tick.

## Concept Art Pack
![Visual Moodboard](./assets/visual-moodboard.png)
![Weapon Lineup Board](./assets/weapon-lineup-board.png)
![Class Silhouette Board](./assets/class-silhouette-board.png)
![Map 1: Helios Yard Board](./assets/map-helios-yard-board.png)
![Map 2: Cathedral Arc Board](./assets/map-cathedral-arc-board.png)
![Map 3: Severance Port Board](./assets/map-severance-port-board.png)
![HUD and Spectator Board](./assets/hud-spectator-board.png)
![Clipping and Share UX Board](./assets/clipping-share-board.png)
![Screen Flow Board](./assets/screen-flow-board.png)

## Data Interfaces
```ts
interface MatchConfig {
  mode: 'ranked' | 'casual' | 'custom';
  map_id: 'helios-yard' | 'cathedral-arc' | 'severance-port';
  round_cap: number;
  tickrate: number;
  friendly_fire: boolean;
}

interface MapDefinition {
  id: string;
  sites: string[];
  lanes: string[];
  callouts: string[];
}

interface ClassDefinition {
  id: 'anchor' | 'entry' | 'controller' | 'scout';
  role: string;
  utility_bias: string;
}

interface WeaponProfile {
  id: string;
  class: 'rifle' | 'smg' | 'shotgun' | 'marksman' | 'sidearm';
  price: number;
  recoil_pattern: string;
  movement_accuracy_penalty: number;
}

interface RoundState {
  round_number: number;
  phase: 'buy' | 'live' | 'post';
  timer_ms: number;
  planted: boolean;
}

interface ClipEvent {
  clip_id: string;
  player_id: string;
  match_id: string;
  round: number;
  trigger: 'manual' | 'ace' | 'clutch' | 'multikill' | 'last_second_objective';
  start_ms: number;
  end_ms: number;
}

interface ClipAsset {
  clip_id: string;
  format: 'webm' | 'mp4';
  storage_path: string;
  signed_url?: string;
  public_url?: string;
}

interface ShareLinkPayload {
  clip_id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
}
```

## Acceptance Scenarios
1. All three maps load with valid sites/callouts.
2. Four classes and twelve guns are selectable with complete stat configs.
3. Economy equations produce expected buy-round outcomes.
4. Clip pipeline creates asset + URL + metadata payload.
5. Replay timeline can jump directly to clip-trigger moments.
6. Netcode remains stable under 80ms and 150ms test profiles.

## Production Checklist
- [ ] map geometry and callout finalization
- [ ] class kit implementation and balancing pass
- [ ] full gun stat table integration
- [ ] clip service (capture/render/upload/share)
- [ ] end-to-end screen flow prototypes
- [ ] netcode reconciliation and reconnect validation
- [ ] replay and spectator QA pass
