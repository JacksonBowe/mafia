from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import List, Union


@dataclass
class Duration:
    ZERO: int = 0
    # Mafia actions
    MAFIA_KILL: int = 3
    # Town Actions
    SHOOTOUT: int = 3
    # Neutral Actions


@dataclass
class GameEvent:
    """What event was it, and who should it be broadcast to"""

    event_id: str
    targets: list
    message: str

    def dump(self) -> dict:
        return asdict(self)


@dataclass
class GameEventGroup:
    """A Grouping of game events, eg. Broadcast event A to all players, and event B to select players"""

    group_id: str = None
    duration: Duration = Duration.ZERO
    events: List[Union[GameEvent, GameEventGroup]] = field(default_factory=list)

    def new_event(self, event: GameEvent):
        self.events.append(event)
        return

    def new_event_group(self, event_group: GameEventGroup):
        self.duration += event_group.duration
        self.events.append(event_group)
        return

    def reset(self, new_id: str = None):
        self.events.clear()
        self.duration = 0
        if new_id:
            self.group_id = new_id
        return self

    def get_by_id(self, id):
        for event in self.events:
            if isinstance(event, GameEventGroup) and event.group_id == id:
                return event
            elif isinstance(event, GameEvent) and event.event_id == id:
                return event

    def dump(self) -> dict:
        return asdict(self)["events"]


# Create a root event group. Bit silly but I want to use the methods
# EVENTS = GameEventGroup(group_id='root')
ACTION_EVENTS = GameEventGroup(group_id="action")


# ------- Shared Events ------- #
@dataclass
class Common:
    INVALID_TARGET = "invalid_target"
    NIGHT_IMMUNE = "night_immune"
    KILLED_BY_MAFIA = "killed_by_mafia"
    VISITED_BY = "visited_by"
