# Game Loop Structure

## Overview

`stacks/MafiaStepFunctions.js` defines the orchestration loop, but the real game-loop behavior is split across:

1. `stacks/MafiaStepFunctions.js`
2. `stacks/MafiaApi.js`
3. `packages/functions/game.py`
4. `packages/functions/core/controllers/lobby_controller.py`
5. `packages/functions/core/controllers/game_controller.py`
6. `packages/functions/core/tables/mafia/entities.py`
7. `packages/functions/core/utils/iot.py`
8. `packages/functions/mafia/engine/game.py`
9. `packages/functions/mafia/engine/game_state.py`
10. `frontend/src/stores/game.js`

The system is a serverless loop built from:

- Step Functions for timed progression
- Lambda for stage transitions
- DynamoDB for persisted game + actor state
- IoT publish events for live client updates
- A separate Mafia engine for night resolution and win logic

## Core Architecture

There are two Step Functions in `stacks/MafiaStepFunctions.js`:

- `ChangeStageMachine`: the real primary game loop
- `TownHallMachine`: defined, but effectively unused

The main loop is:

1. Wait for the current stage duration.
2. Invoke `packages/functions/game.changeStage`.
3. That Lambda loads game state from DynamoDB.
4. It decides the next stage and performs any side effects.
5. It returns `{ gameId, waitSeconds, continue, pollCount }`.
6. Step Functions either:
   - waits again and repeats, or
   - exits if `continue` is `false`.

Relevant wiring:

- `MafiaApi.js` injects `CHANGE_STATE_MACHINE_ARN` and `TOWN_HALL_MACHINE_ARN` into API Lambdas.
- `LobbyController.start_lobby()` calls `GameController.create_game()`.
- `GameController.create_game()` persists the game and starts `ChangeStageMachine`.

## Startup Flow

### Lobby start

`packages/functions/core/controllers/lobby_controller.py:307-331`

When the host starts a lobby:

1. Publish `LOBBY:START` over IoT.
2. Call `GameController.create_game(lobby)`.

### Game creation

`packages/functions/core/controllers/game_controller.py:45-69`

`create_game()`:

1. Converts lobby players into engine player objects.
2. Calls `Mafia.new_game(...)`.
3. Converts engine output into:
   - one `Game` DynamoDB record
   - multiple `GameActor` records
4. Updates each user with `game=<gameId>`.
5. Publishes each player's private actor data via IoT.
6. Starts the primary Step Function in `PREGAME`.

### Primary state machine start

`game_controller.py:88-95`

```py
set_stage(game_id, "PREGAME", pregame_duration)
start_execution(
  CHANGE_STATE_MACHINE_ARN,
  input={ "waitSeconds": pregame_duration, "gameId": game_id }
)
```

## State Machine Structure

`stacks/MafiaStepFunctions.js:27-58`

The `ChangeStageMachine` is a simple polling loop:

```text
Configure
  -> Choice Winner?
     if continue == true:
        Wait(waitSeconds)
        Invoke ChangeStage Lambda
        loop back to Choice
     else:
        End
```

Pseudocode:

```pseudo
state = {
  gameId,
  continue: true,
  waitSeconds: initialWait
}

while state.continue == true:
    wait(state.waitSeconds)
    state = changeStage(state)

end
```

Important detail:
`change_stage()` returns `waitSeconds = duration + 2` to give IoT/frontend time to catch up.

## Where the Real Loop Lives

`packages/functions/game.py:27-31`

The Step Function invokes:

- `changeStage(event, context)` -> `GameController.change_stage(...)`
- `townHall(event, context)` -> `GameController.town_hall(...)`

But `town_hall()` is not actually implemented in the controller anymore. The poll/trial loop is now folded into `change_stage()`.

So the active loop is entirely driven by:

`packages/functions/core/controllers/game_controller.py:528-579`

## Stage Progression

The game defines these stages:

- `PREGAME`
- `MORNING`
- `DAY`
- `POLL`
- `DEFENSE`
- `TRIAL`
- `LYNCH`
- `EVENING`
- `NIGHT`

Main dispatcher:

```pseudo
game = load_game_from_dynamo(game_id, with_actors=true)

switch game.stage:
  PREGAME -> process_pregame
  MORNING -> process_morning
  DAY     -> process_day
  POLL    -> process_poll(poll_count + 1)
  DEFENSE -> process_defense
  TRIAL   -> process_trial(poll_count)
  LYNCH   -> process_lynch(poll_count)
  EVENING -> process_evening
  NIGHT   -> process_night

if next_stage == POLL:
    publish GAME:TRIAL_OVER
    stage_label = "POLL - <n>"

if next_stage == EVENING:
    poll_count = 0
    publish GAME:TRIAL_OVER

if continue:
    set_stage(next_stage, duration, stage_label)

return {
  gameId,
  waitSeconds: duration + 2,
  continue,
  pollCount
}
```

## Stage-by-Stage Behavior

### 1. PREGAME

`game_controller.py:581-592`

Behavior:

- Re-publishes each actor's private role data via IoT.
- Advances to `EVENING` after 10 seconds.

That means the current implementation starts the first real cycle at `EVENING`, not `MORNING` or `DAY`.

Pseudocode:

```pseudo
for actor in game.actors:
    publish private GAME:ACTOR to actor

return EVENING, 10, true
```

### 2. EVENING

`game_controller.py:720-758`

This is where night actions are resolved using the Mafia engine.

Behavior:

1. Reconstruct engine game from persisted actors + stored game state.
2. Call `egame.resolve()`.
3. Save updated `game.state`.
4. Save generated `game.events`.
5. Update each actor from engine output and rewrite actor records.
6. Move to `NIGHT` for `egame.events.duration` seconds.

This is the most important mutation point in the loop.

Pseudocode:

```pseudo
egame = Mafia.load_game(players=actors, state=game.state, save=game.config)
egame.resolve()

game.state = egame.dump_state()
save game.state to Dynamo

game.events = egame.events.dump()
save game.events to Dynamo

for each actor in game.actors:
    actor.update_from_engine(matching_engine_actor)
    write actor to Dynamo

return NIGHT, egame.events.duration, true
```

Notes:

- `resolve()` increments the day counter in the engine.
- It validates targets before resolving actions.
- It produces nested event groups with durations.

### 3. NIGHT

`game_controller.py:760-801`

This stage replays the previously generated `game.events` to players over IoT.

Behavior:

1. Iterate through saved event groups.
2. Publish each event either:
   - to all players (`game/<id>`) when target is `*`
   - or to a single actor topic
3. Sleep between event groups when duration > 0.
4. Re-publish actor snapshots.
5. Publish updated game state.
6. Clear all player targets for the next night.
7. Delete `game.events`.
8. Move to `MORNING`.

Pseudocode:

```pseudo
for action_event in game.events:
  for event_group in action_event.events:
    for event in event_group.events:
      for target in event.targets:
        publish GAME:EVENT to public or private topic

    if event_group.duration > 0:
      sleep(event_group.duration)

for actor in game.actors:
  publish private GAME:ACTOR

publish GAME:STATE

for actor in game.actors:
  clear actor.targets in Dynamo

delete game.events from Dynamo

return MORNING, 10, true
```

This stage is effectively the presentation layer for the results computed during `EVENING`.

### 4. MORNING

`game_controller.py:594-638`

Behavior:

1. Reconstruct engine game.
2. Find deaths whose `deathDay == game.state.day`.
3. Publish `GAME:DEATHS` if needed.
4. Publish `GAME:STATE`.
5. Call engine `check_for_win()`.
6. If winners exist:
   - publish `GAME:OVER`
   - stop the Step Function loop
7. Otherwise advance to `DAY`.

Pseudocode:

```pseudo
mafia_game = Mafia.load_game(players, state, config)

deaths = graveyard entries where deathDay == current day
if deaths:
    publish GAME:DEATHS

publish GAME:STATE

winners = mafia_game.check_for_win()
if winners:
    publish GAME:OVER
    return DAY, 10, false

return DAY, 10, true
```

Important:
The loop terminates only here, after checking for winners.

### 5. DAY

`game_controller.py:640-649`

Pure timer stage.

Behavior:

- No mutations.
- Gives players time to chat.
- Then moves to `POLL`.

```pseudo
return POLL, 10, true
```

### 6. POLL

`game_controller.py:651-672`

This is the public vote stage.

Behavior:

1. Clear `on_trial` from any previously trialed player.
2. Clear all verdicts.
3. Tally votes from alive actors.
4. If too many polls have occurred (`poll_count > 2`), skip to `EVENING`.
5. If a majority target exists:
   - mark them `on_trial`
   - publish `GAME:TRIAL`
   - move to `DEFENSE`
6. Otherwise loop back into another `POLL`.

Pseudocode:

```pseudo
clear on_trial for actors on trial
clear verdict for all actors

voted_target = tally_votes(game)

if poll_count > 2:
    return EVENING, 10, true

if voted_target exists:
    set voted_target.on_trial = true
    publish GAME:TRIAL(playerNumber)
    return DEFENSE, 10, true

return POLL, 10, true
```

### Vote tally logic

`game_controller.py:434-450`

- Uses alive actors' `vote` values.
- Picks the most frequent target number.
- Treats majority as `votes.count(target) >= floor(len(game.actors) / 2)`

That is notable because:

- it uses total actor count, not alive actor count
- it uses `>= floor(n/2)`, with a TODO saying it should probably be `>`

So vote-majority semantics are somewhat loose right now.

### 7. DEFENSE

`game_controller.py:674-679`

Pure timer stage for the accused player's defense.

```pseudo
return TRIAL, 10, true
```

### 8. TRIAL

`game_controller.py:681-690`

Uses verdicts submitted by players through `/game/verdict`.

Behavior:

1. Count `guilty` vs `innocent` verdicts among alive actors.
2. If guilty wins, advance to `LYNCH`.
3. If not guilty and this was already a later poll cycle, go to `EVENING`.
4. Otherwise return to `POLL`.

Pseudocode:

```pseudo
verdict = get_verdict(game)

if verdict == guilty:
    return LYNCH, 10, true

if poll_count >= 2:
    return EVENING, 10, true

return POLL, 10, true
```

### 9. LYNCH

`game_controller.py:692-718`

Behavior:

1. Reload engine game.
2. Find actor with `on_trial`.
3. Call `egame.lynch(playerNumber)`.
4. Mark that actor dead in Dynamo.
5. Publish updated actor privately.
6. Persist updated `game.state`.
7. Publish `GAME:STATE`.
8. Clear votes and verdicts.
9. Either:
   - go to `EVENING`, or
   - go back to `POLL`

Pseudocode:

```pseudo
egame = Mafia.load_game(...)
lynchee = actor where on_trial == true

egame.lynch(lynchee.number)

lynchee.alive = false
save actor alive=false
publish private GAME:ACTOR

game.state = egame.dump_state()
save game.state
publish GAME:STATE

clear all votes
clear all verdicts

if poll_count > 2:
    return EVENING, 10, true
return POLL, 10, true
```

## How Players Feed the Loop

The loop is not autonomous in terms of choices; players mutate actor records through API calls between timed stages.

`packages/functions/game.py`

- `POST /game/vote` -> `GameController.vote(...)`
- `POST /game/verdict` -> `GameController.verdict(...)`
- `POST /game/targets` -> `GameController.targets(...)`

These write to `GameActor` records in DynamoDB.

### Vote writes

`game_controller.py:276-307`

- Stores `vote` on the actor record.
- Reuses the same endpoint for create/change/cancel.
- Broadcasts `GAME:VOTE` or `GAME:VOTECANCEL`.

### Verdict writes

`game_controller.py:341-354`

- Stores `verdict` on the actor record.

### Night target writes

`game_controller.py:381-384`

- Stores `targets` JSON on the actor record.

Those persisted values are what the next stage transition reads.

## Persistence Model

`packages/functions/core/tables/mafia/entities.py`

### Game record

Stored as:

- `PK = gameId`
- `SK = "A"`

Fields include:

- `config`
- `state`
- `events`
- `stage`

### GameActor records

Stored as:

- `PK = gameId`
- `SK = GAME_ACTOR#<actorId>`

Fields include:

- identity / role / alias / alive
- `possible_targets`
- `targets`
- `vote`
- `verdict`
- `on_trial`
- `allies`
- `number`
- `role_actions`

This matters because the game loop is essentially:

- load all actor records
- derive next state
- write updated game + actor records
- publish IoT notifications

## Client-Side View of the Loop

`frontend/src/stores/game.js`

The frontend subscribes to:

- `mafia/game/<gameId>` for public events
- `mafia/game/<gameId>/actor/<userId>` for private actor updates

Handled events include:

- `GAME:ACTOR`
- `GAME:NEWSTAGE`
- `GAME:VOTE`
- `GAME:VOTECANCEL`
- `GAME:TRIAL`
- `GAME:TRIAL_OVER`
- `GAME:STATE`
- `GAME:DEATHS`
- `GAME:OVER`

So from the client's perspective, the loop is driven entirely by IoT messages plus occasional API writes for player actions.

## End-to-End Loop Pseudocode

```pseudo
on lobby start:
  create engine game
  persist game + actors
  notify each player of their actor/role
  set stage = PREGAME
  start ChangeStageMachine(wait = pregame duration)

while continue == true:
  wait(waitSeconds)

  load game + actors from Dynamo

  switch stage:
    PREGAME:
      notify actors
      next = EVENING

    EVENING:
      rebuild engine game
      resolve night actions
      persist new game.state
      persist game.events
      persist updated actor snapshots
      next = NIGHT
      duration = events.duration

    NIGHT:
      replay saved game.events over IoT
      notify actors
      notify game state
      clear actor targets
      clear game.events
      next = MORNING

    MORNING:
      publish deaths
      publish game state
      if engine says someone won:
        publish GAME:OVER
        continue = false
      else:
        next = DAY

    DAY:
      next = POLL

    POLL:
      clear trial flag and verdicts
      tally votes
      if too many poll rounds:
        next = EVENING
      else if majority target:
        mark target on_trial
        publish GAME:TRIAL
        next = DEFENSE
      else:
        next = POLL

    DEFENSE:
      next = TRIAL

    TRIAL:
      count guilty vs innocent verdicts
      if guilty:
        next = LYNCH
      else if already deep in poll cycle:
        next = EVENING
      else:
        next = POLL

    LYNCH:
      kill on_trial player
      persist actor + game state
      clear votes/verdicts
      if too many poll rounds:
        next = EVENING
      else:
        next = POLL

  if continue:
    publish GAME:NEWSTAGE(name, duration)
    return waitSeconds = duration + 2
  else:
    end state machine
```

## Important Findings / Oddities

1. `TownHallMachine` is dead code for the current loop.
   `MafiaStepFunctions.js` defines it, but the real poll/trial loop is now inside `change_stage()`.

2. The game currently jumps from `PREGAME` straight to `EVENING`.
   `_process_pregame()` returns `EVENING`. That means the first substantive cycle is a night-resolution cycle.

3. Win detection only happens in `MORNING`.
   Even if a lynch should end the game, the loop continues until morning processing.

4. `NIGHT` is not resolution; it is event playback.
   Actual night action resolution happens during `EVENING`.

5. The poll majority logic is shaky.
   It uses `>= floor(len(game.actors)/2)` and total actor count rather than alive actors.

6. `ChangeStageMachine` has a 5-minute timeout.
   Long games with many loops could exceed that.

7. `GAME:LYNCH` is defined client-side and in IoT enums, but I do not see it being published during `_process_lynch()`.

## Bottom Line

The game loop is a timed Step Functions state machine that repeatedly invokes a Lambda to advance one stage at a time. DynamoDB is the source of truth, IoT is the real-time transport to clients, and the Mafia engine is only invoked when the loop needs to resolve or evaluate actual game logic, especially in `EVENING`, `LYNCH`, and `MORNING`.
