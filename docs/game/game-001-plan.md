# Game Implementation Plan

This document extracts core functionality from the old Python implementation and outlines a step-by-step plan for implementing Games in the new TypeScript monorepo.

---

## 1. Core Concepts

### 1.1 Game Phases (formerly "Stages")

```typescript
enum GamePhase {
	PREGAME = 'PREGAME', // Role reveal, game setup
	MORNING = 'MORNING', // Announce deaths from previous night, check win conditions
	DAY = 'DAY', // Discussion time
	POLL = 'POLL', // Voting to put someone on trial (up to 3 attempts)
	DEFENSE = 'DEFENSE', // Accused player defends themselves
	TRIAL = 'TRIAL', // Jury votes guilty/innocent
	LYNCH = 'LYNCH', // Execute guilty verdict
	EVENING = 'EVENING', // Resolve day actions, prepare for night
	NIGHT = 'NIGHT', // Night actions executed
}
```

### 1.2 Phase Flow

```
PREGAME -> EVENING -> NIGHT -> MORNING -> DAY -> POLL
                                                   |
                              +--------------------+
                              |
                              v
              POLL (loop up to 3x) -----> EVENING (no majority)
                |
                | (vote majority)
                v
              DEFENSE -> TRIAL
                           |
            +--------------+---------------+
            |                              |
            v                              v
          LYNCH (guilty)             POLL (innocent, polls < 3)
            |                              |
            v                              v
          POLL (polls < 3)           EVENING (polls >= 3)
            |
            v
          EVENING (polls >= 3)
```

### 1.3 Key Entities

| Entity         | Description                                                          |
| -------------- | -------------------------------------------------------------------- |
| **Game**       | Core game record: id, phase, day, state, config, events              |
| **GameActor**  | Per-player game state: role, alive, targets, vote, verdict, on_trial |
| **GameState**  | Shared state: day, players list, graveyard                           |
| **GameConfig** | Role settings, tags, game settings                                   |

---

## 2. Data Models

### 2.1 Existing Database Schema (PostgreSQL + Drizzle)

The data layer is **already implemented** in `packages/core/src/game/`:

**`game` table** (`game.sql.ts`):

- `id` - ULID primary key
- `status` - 'active' | 'completed' | 'cancelled'
- `phase` - Current game phase
- `startedAt` - Timestamp
- `engineState` - JSONB (serialized `GameStateInput` from engine)
- `engineConfig` - JSONB (serialized `GameConfigInput` from engine)
- `actors` - JSONB (serialized `ActorState[]` from engine)

**`game_player` table** (join table):

- `id` - ULID primary key
- `gameId` - FK to game
- `userId` - User reference
- `number` - Player number (1-15)
- `alias` - In-game alias
- `role` - Assigned role

### 2.2 Engine Types (from `packages/engine/src/types.ts`)

```typescript
// Input to create/load a game
interface PlayerInput {
	id: string;
	name: string;
	alias: string;
	role?: string;
	number?: number;
	alive: boolean;
	possibleTargets: number[][];
	targets: number[];
	allies: object[];
	roleActions: Record<string, unknown>;
}

// Public game state
interface GameStateInput {
	day: number;
	players: StatePlayer[];
	graveyard: StateGraveyardRecord[];
}

// Result from engine operations
interface EngineResult {
	state: GameStateInput;
	actors: ActorState[];
	events: GameEventGroupDump;
	winners: WinnerSummary[] | null;
	log: string[];
}
```

---

## 3. API Endpoints

| Method | Path            | Description                            |
| ------ | --------------- | -------------------------------------- |
| GET    | `/game`         | Get current game state (public info)   |
| GET    | `/game/actor`   | Get caller's actor data (private)      |
| POST   | `/game/vote`    | Submit/cancel day vote                 |
| POST   | `/game/verdict` | Submit trial verdict (guilty/innocent) |
| POST   | `/game/targets` | Submit night action targets            |
| POST   | `/game/chat`    | Send chat message                      |

---

## 4. Realtime Events

### 4.1 Public Events (broadcast to all players)

| Event             | Payload                | When                        |
| ----------------- | ---------------------- | --------------------------- |
| `game.newstage`   | `{ name, duration }`   | Phase changes               |
| `game.vote`       | `{ voter, target }`    | Player votes                |
| `game.votecancel` | `{ voter, target }`    | Player cancels vote         |
| `game.trial`      | `{ player }`           | Player put on trial         |
| `game.trial_over` | `{}`                   | Trial ends                  |
| `game.state`      | `GameState`            | State update                |
| `game.deaths`     | `DeathRecord[]`        | Morning death announcements |
| `game.over`       | `Winner[]`             | Game ends                   |
| `game.terminated` | `{ error?, message? }` | Game aborted                |

### 4.2 Private Events (to specific player)

| Event        | Payload                 | When                |
| ------------ | ----------------------- | ------------------- |
| `game.actor` | `GameActor`             | Actor data update   |
| `game.event` | `{ event_id, message }` | Night action result |

### 4.3 Topic Structure

```
game/{gameId}                    # Public channel
game/{gameId}/actor/{actorId}    # Private channel per player
game/{gameId}/chat/all           # Public chat
game/{gameId}/chat/{faction}     # Faction chat (mafia)
```

---

## 5. Phase Processing Logic

### 5.1 PREGAME

- **Duration**: ~15 seconds
- **Actions**:
    1. Notify all actors of their role assignment
    2. Transition to EVENING

### 5.2 MORNING

- **Duration**: ~10 seconds
- **Actions**:
    1. Load game engine with current state
    2. Find deaths from previous night (graveyard where `deathDay == currentDay`)
    3. Broadcast deaths to all players
    4. Broadcast updated game state
    5. Check win conditions
    6. If winners exist: broadcast `game.over`, end game
    7. Else: transition to DAY

### 5.3 DAY

- **Duration**: ~10 seconds (configurable discussion time)
- **Actions**:
    1. Players discuss (chat enabled)
    2. Transition to POLL

### 5.4 POLL

- **Duration**: ~10 seconds
- **Actions**:
    1. Clear any previous trial status
    2. Clear all verdicts
    3. Tally votes
    4. If vote majority (>50% for one player):
        - Set that player `onTrial = true`
        - Broadcast `game.trial`
        - Transition to DEFENSE
    5. If no majority and pollCount < 3:
        - Loop back to POLL (increment pollCount)
    6. If pollCount >= 3:
        - Transition to EVENING

### 5.5 DEFENSE

- **Duration**: ~10 seconds
- **Actions**:
    1. Player on trial can speak/defend
    2. Transition to TRIAL

### 5.6 TRIAL

- **Duration**: ~10 seconds
- **Actions**:
    1. Tally verdicts (guilty vs innocent)
    2. If guilty > innocent:
        - Transition to LYNCH
    3. If innocent wins and pollCount < 3:
        - Transition to POLL
    4. If pollCount >= 3:
        - Transition to EVENING

### 5.7 LYNCH

- **Duration**: ~10 seconds
- **Actions**:
    1. Execute player on trial via engine
    2. Mark actor as dead in DB
    3. Update game state
    4. Broadcast updated state
    5. Clear all votes and verdicts
    6. If pollCount < 3: transition to POLL
    7. Else: transition to EVENING

### 5.8 EVENING

- **Duration**: Variable (based on event animations)
- **Actions**:
    1. Reset poll count to 0
    2. Broadcast `game.trial_over`
    3. Load game engine
    4. Call `engine.resolve()` to process day-end actions
    5. Update game state in DB
    6. Store events for night phase
    7. Update all actor records
    8. Transition to NIGHT

### 5.9 NIGHT

- **Duration**: ~10 seconds + event durations
- **Actions**:
    1. Process stored events, broadcast to appropriate targets
    2. Notify all actors of their updated state (new targets, etc.)
    3. Broadcast game state
    4. Clear all player targets
    5. Clear events from game record
    6. Transition to MORNING

---

## 6. Vote System

### 6.1 Day Voting (POLL phase)

- Players vote by player number (not ID - security)
- Vote states:
    - **New vote**: Store vote, broadcast `game.vote`
    - **Cancel vote**: Remove vote (target matches current), broadcast `game.votecancel`
    - **Change vote**: Update vote, broadcast `game.vote`

### 6.2 Vote Tallying

```typescript
function tallyVotes(actors: GameActor[]): GameActor | null {
	const aliveActors = actors.filter((a) => a.alive);
	const votes = aliveActors.map((a) => a.vote).filter(Boolean);

	if (votes.length === 0) return null;

	// Find most voted player
	const voteCounts = countVotes(votes);
	const maxVoted = getMaxVoted(voteCounts);

	// Check majority (> 50%)
	const majority = voteCounts[maxVoted] > Math.floor(aliveActors.length / 2);

	return majority ? actors.find((a) => a.number === maxVoted) : null;
}
```

### 6.3 Trial Verdict

- Players vote `guilty` or `innocent`
- Guilty wins on `guilty > innocent` (tie = innocent)

---

## 7. UI Components

### 7.1 GamePage (Main Container)

- **Responsibilities**:
    - Layout orchestration
    - Background image based on phase (morning/day/evening/night)
    - Subscribe to realtime channels on mount
    - Route guards (redirect if not in game)

### 7.2 StageTimer

- **Responsibilities**:
    - Display current phase name
    - Countdown timer for phase duration

### 7.3 RoleCard

- **Responsibilities**:
    - Display player's assigned role
    - Show role abilities and faction
    - Show role-specific settings

### 7.4 ActionsCard

- **Responsibilities**:
    - Display available actions based on phase
    - Day: Vote buttons for each player
    - Night: Target selection for abilities

### 7.5 RolesList

- **Responsibilities**:
    - Display role slots/tags for the game
    - Track which roles have been revealed (deaths)

### 7.6 Graveyard

- **Responsibilities**:
    - Display dead players grouped by death day
    - Show death reason and revealed role

### 7.7 JuryCard

- **Responsibilities**:
    - Overlay during DEFENSE/TRIAL phases
    - Show player on trial
    - Verdict voting UI (if not the accused)

### 7.8 GameChatCard

- **Responsibilities**:
    - Display messages
    - Send messages
    - Filter by channel (public/faction)

---

## 8. Frontend Architecture

### 8.1 Pattern: VueQuery + Pinia

Following existing patterns in `packages/web/app/src/lib/lobby/`:

**API Layer** (`lib/game/api.ts`):

- Pure functions for HTTP calls
- No state management, just fetch/return

```typescript
// Example pattern from lobby/api.ts
export const fetchGame = async (gameId: string): Promise<GameInfo> => {
	const res = await api.get<GameInfo>(`/game/${gameId}`);
	return res.data;
};

export const submitVote = async (targetNumber: number): Promise<void> => {
	await api.post('/game/vote', { target: targetNumber });
};
```

**Hooks Layer** (`lib/game/hooks.ts`):

- VueQuery hooks for data fetching
- Mutations update store in `onSuccess`
- Invalidate queries on mutation success

```typescript
// Example pattern from lobby/hooks.ts
export const useGame = (gameId: MaybeRef<string | null>) => {
	return useQuery({
		queryKey: computed(() => ['game', unref(gameId)] as const),
		queryFn: () => fetchGame(unref(gameId)!),
		enabled: computed(() => !!unref(gameId)),
	});
};

export const useSubmitVote = () => {
	const queryClient = useQueryClient();
	const gStore = useGameStore();
	const rt = useRealtime();

	return useMutation({
		mutationFn: submitVote,
		onSuccess: async () => {
			// Invalidate to refetch from server
			await queryClient.invalidateQueries({ queryKey: ['game'] });
		},
	});
};
```

**Store** (`stores/game.ts`):

- **Only for local UI state**, NOT server data
- Server data lives in VueQuery cache
- Store handles: pending states, selections, realtime-derived state

```typescript
// Current store (already exists) - extend as needed
interface GameStoreState {
	currentGameId: string | null;
	transitionPending: boolean;

	// Add for realtime-derived state:
	votes: Record<number, number>; // voterNumber -> targetNumber (from realtime)
	playerOnTrial: number | null; // from realtime events
	phase: { name: string; duration: number } | null; // from realtime
	deaths: DeathRecord[]; // from realtime morning announcement
	winners: WinnerSummary[] | null; // from realtime game.over
}
```

### 8.2 Realtime Event Handling

Events update the Pinia store directly (not VueQuery cache):

```typescript
// In lib/game/events.ts
export const setupGameEvents = (gameId: string) => {
	const gStore = useGameStore();
	const rt = useRealtime();

	rt.subscribe(`game/${gameId}`);

	// Listen for phase changes
	rt.on('game.newstage', (data) => {
		gStore.setPhase(data);
	});

	// Listen for votes (optimistic from other players)
	rt.on('game.vote', (data) => {
		gStore.addVote(data.voter, data.target);
	});

	// etc.
};
```

---

## 9. Infrastructure

### 9.1 Step Functions State Machine

The game loop is driven by AWS Step Functions:

```
[Configure] -> [Check Winner?]
                    |
         +----yes--+----no----+
         |                    |
         v                    v
    [End Game]          [Wait X seconds]
                              |
                              v
                    [Invoke ChangeStage Lambda]
                              |
                              v
                        [Check Winner?] (loop)
```

### 9.2 Lambda Functions

| Function      | Purpose                                      |
| ------------- | -------------------------------------------- |
| `changeStage` | Main game loop - processes phase transitions |

### 9.3 Required Permissions

- PostgreSQL (via RDS): read/write game records
- IoT: publish to game topics
- Step Functions: start executions

---

## 10. Implementation Steps

### Phase 1: Data Layer (DONE)

1. [x] Create `packages/core/src/game/game.sql.ts` - Game table schema
2. [x] Create `packages/core/src/game/index.ts` - Game domain exports
3. [x] Define Zod schemas for validation
4. [x] Create basic game CRUD operations with Drizzle
5. [x] Add voting/verdict fields to game state or separate table
6. [x] Add `pollCount` tracking to game record

### Phase 2: Game Engine (MOSTLY DONE)

The engine already exists in `packages/engine/`:

7. [x] `newGame({ players, config })` - Creates game, assigns roles
8. [x] `loadGame({ players, config, state })` - Loads existing game
9. [x] `resolveGame({ players, config, state })` - Resolves night actions
10. [x] `game.checkForWin()` - Returns winners or null
11. [x] `game.lynch(number)` - Executes a player
12. [ ] Verify engine handles all required phase transitions
13. [ ] Add any missing role implementations

**Engine Usage** (from `lobby.ts:153`):

```typescript
const engineResult = newGame({ players, config });
// Returns: { state, actors, events, winners, log }
```

### Phase 3: API Routes

14. [ ] Create `packages/functions/src/api/game.ts` - Game API routes
15. [ ] Implement `GET /game` - Get current game for user
16. [ ] Implement `GET /game/actor` - Get caller's private actor data
17. [ ] Implement `POST /game/vote` - Submit/cancel day vote
18. [ ] Implement `POST /game/verdict` - Submit trial verdict
19. [ ] Implement `POST /game/targets` - Submit night action targets

### Phase 4: Realtime Events (DONE)

20. [x] Define game events in `packages/core/src/game/index.ts` similar to in `packages/core/src/lobby/index.ts`. ./old-attempt/game_controller.py can indicate where in the flow
21. [x] Implement publish helpers for each event type
22. [x] Set up topic structure for public/private channels

### Phase 5: Game Loop (Step Functions)

23. [ ] Create `infra/game.ts` - Game infrastructure
24. [ ] Define Step Functions state machine
25. [ ] Implement `changePhase` Lambda handler
26. [ ] Implement phase processors:
    - [ ] `processPregame`
    - [ ] `processMorning`
    - [ ] `processDay`
    - [ ] `processPoll`
    - [ ] `processDefense`
    - [ ] `processTrial`
    - [ ] `processLynch`
    - [ ] `processEvening`
    - [ ] `processNight`

### Phase 6: Game Creation Flow (PARTIALLY DONE)

27. [x] Lobby "start game" calls `newGame()` (see `lobby.ts:127`)
28. [x] Game record created with engine output
29. [x] Realtime event `lobby.started` published with gameId
30. [ ] Start Step Functions state machine on game creation

### Phase 7: Frontend - API & Hooks

31. [ ] Create `packages/web/app/src/lib/game/api.ts`
32. [ ] Create `packages/web/app/src/lib/game/hooks.ts`
33. [ ] Implement `useGame(gameId)` query
34. [ ] Implement `useGameActor()` query
35. [ ] Implement `useSubmitVote()` mutation
36. [ ] Implement `useSubmitVerdict()` mutation
37. [ ] Implement `useSubmitTargets()` mutation

### Phase 8: Frontend - Store & Events

38. [ ] Extend `packages/web/app/src/stores/game.ts`
39. [ ] Add realtime-derived state (votes, phase, deaths, etc.)
40. [ ] Create `packages/web/app/src/lib/game/events.ts`
41. [ ] Implement realtime event handlers

### Phase 9: Frontend - Components

42. [ ] Create `GamePage.vue` - Main game view
43. [ ] Create `PhaseTimer.vue` - Phase name + countdown
44. [ ] Create `RoleCard.vue` - Role display
45. [ ] Create `ActionsCard.vue` - Vote/target buttons
46. [ ] Create `RolesList.vue` - Role slot tags
47. [ ] Create `Graveyard.vue` - Dead players
48. [ ] Create `JuryCard.vue` - Trial voting overlay
49. [ ] Create `GameChat.vue` - Chat interface

### Phase 10: Testing & Polish

50. [ ] Write unit tests for phase transitions
51. [ ] Write unit tests for vote tallying
52. [ ] Write engine tests for edge cases
53. [ ] Add error handling and validation
54. [ ] Performance optimization

---

## 11. Notes from Old Implementation

### Pain Points Addressed

1. **DynamoDB -> PostgreSQL**: Use Drizzle transactions instead of manual DDB operations
2. **Event timing**: Use Step Functions wait states instead of `time.sleep()`
3. **Type safety**: TypeScript throughout with Zod validation
4. **State management**: VueQuery for server state, Pinia only for UI state

### Key Learnings

1. Player numbers (not IDs) are used for voting - intentional security measure
2. Poll count tracks voting rounds (max 3 before moving to evening)
3. Events have durations for frontend animations
4. Faction chat requires special subscription handling
5. Trial status must be cleared between polls

### Config Structure

Game config includes role "tags" which are slots filled with actual roles during creation:

```typescript
const config = {
	tags: ['town_protective', 'mafia_killing', 'neutral_evil', ...],
	roles: {
		Doctor: { max: 1, weight: 1, settings: {} },
		Mafioso: { max: 1, weight: 1, settings: {} },
		// ...
	},
};
```
