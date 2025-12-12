from typing import List

import engine.events as events
from engine.events import ACTION_EVENTS
from engine.models import Player
from engine.roles.actor import Actor, Mafia


class Mafioso(Mafia):
    tags = ["any_random", "mafia_random", "mafia_killing"]

    def __init__(self, player: Player, settings: dict = dict()):
        super().__init__(player)
        # self.role_name = 'MafiosoTest'

    def find_possible_targets(self, actors: List[Actor] = None) -> List[Actor]:
        # Number of targets
        num_targets = 1

        self.possible_targets = []
        for i in range(num_targets):
            self.possible_targets.insert(
                i,
                {
                    actor
                    for actor in actors
                    if actor.alive
                    and actor.alignment != self.alignment
                    and actor.number
                    != self.number  # Seems a bit redundant, but can't hurt
                },
            )

        return self.possible_targets

    def action(self):
        target = self.targets[0]

        # clear all other Mafioso targets
        brothers = [ally for ally in self.allies if isinstance(ally, Mafioso)]
        for brother in brothers:
            brother.clear_targets()

        def success():
            success_event_group = events.GameEventGroup(
                group_id="mafioso_action_success", duration=events.Duration.MAFIA_KILL
            )

            # Inform all players that a Mafia kill has succeeded
            success_event_group.new_event(
                events.GameEvent(
                    event_id="mafia_kill_success",
                    targets=["*"],
                    message="There are sounds of shots in the streets",
                )
            )

            # Inform the target player that they have been killed
            success_event_group.new_event(
                events.GameEvent(
                    event_id=events.Common.KILLED_BY_MAFIA,
                    targets=[target.player.id],
                    message="You were killed by a member of the Mafia",
                )
            )

            ACTION_EVENTS.new_event_group(success_event_group)

        def fail():
            fail_event_group = events.GameEventGroup(
                group_id="mafioso_action_fail", duration=events.Duration.MAFIA_KILL
            )

            # Inform all players that a Mafia kill has failed
            fail_event_group.new_event(
                events.GameEvent(event_id="mafia_kill_fail", targets=["*"], message="")
            )

            ACTION_EVENTS.new_event_group(fail_event_group)

        self.kill(target, success, fail)
