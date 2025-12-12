from typing import List

import engine.events as events
from engine.events import ACTION_EVENTS
from engine.models import Player

# from engine.roles import Actor
from engine.roles.actor import Actor, Town
from engine.utils.logging import logger


class Bodyguard(Town):
    tags = ["any_random", "town_random", "town_protective", "town_killing"]

    def __init__(self, player: Player, settings: dict = dict()):
        super().__init__(player)
        # self.role_name = "Bodyguard"

    def find_possible_targets(self, actors: List[Actor] = None) -> List[Actor]:
        num_targets = 1
        self.possible_targets = []
        for i in range(num_targets):
            self.possible_targets.insert(
                i,
                [actor for actor in actors if actor.alive and actor != self],
            )
        return self.possible_targets

    def action(self):
        target = self.targets[0]
        logger.info(f"{self} will protect {target}")
        self.visit(target)
        target.bodyguards.append(
            self
        )  # Add self into the list of bodyguards protecting this target
        self.guarding = target

    def shootout(self, attacker: Actor):
        logger.info(f"{self} defends their target from {attacker}")
        shootout_event_group = events.GameEventGroup(
            group_id="shootout", duration=events.Duration.SHOOTOUT
        )

        # Inform all players that a shootout has occured
        shootout_event_group.new_event(
            events.GameEvent(
                event_id="bodyguard_shootout",
                targets=["*"],
                message="You hear sounds of a shootout",
            )
        )

        # TODO: Inform other bodyguards?
        # Inform the player that they have been protected
        shootout_event_group.new_event(
            events.GameEvent(
                event_id="bodyguard_protected",
                targets=[self.guarding.player.id],
                message="You were protected by a bodyguard",
            )
        )

        # Inform the attacker that they have died in a shootout
        shootout_event_group.new_event(
            events.GameEvent(
                event_id="bodyguard_protected",
                targets=[attacker.player.id],
                message="You were killed by the Bodyguard defending your target",
            )
        )

        # Inform self that you have died defending target
        shootout_event_group.new_event(
            events.GameEvent(
                event_id="bodyguard_protected",
                targets=[self.player.id],
                message="You died defending your target",
            )
        )

        ACTION_EVENTS.new_event_group(shootout_event_group)

        self.die("Died in a shootout")
        attacker.die("Died in a shootout")
