import copy
import random
from typing import List

from engine.events import ACTION_EVENTS, GameEventGroup
from engine.models import GameConfig, GameState, Player
from engine.roles import ROLE_LIST, Actor, import_role
from engine.utils.logging import logger


class Game:
    def __init__(self, day: int, players: List[Player], config: GameConfig):
        self.day = day
        self.config = config
        self.actors: List[Actor] = []
        self._graveyard = []
        self.events = GameEventGroup(group_id="root")

        logger.info("Importing required roles and instantiating actors")
        for index, player in enumerate(players):
            Role = import_role(player.role)
            # Instantiate a Role class with a :player and :roles_settings[role]
            actor = Role(player, config.roles[player.role].settings)
            self.actors.append(actor)

        self.generate_allies_and_possible_targets()

    @classmethod
    def new(cls, players: List[Player], config: GameConfig):
        logger.info("--- Creating a new Game ---")
        logger.info("Players: {}".format(players))

        roles, failures = config.generate_roles()

        # Assign rules and numbers to players
        random.shuffle(players)
        random.shuffle(roles)

        # Ensure that there are equal roles to players, pad roles with 'Citizen'
        if len(players) > len(roles):
            roles.extend(["Citizen"] * (len(players) - len(roles)))

        # Allocate roles
        logger.info("--- Allocating roles ---")
        for index, player in enumerate(players):
            player.number = index + 1
            player.role = roles[index]
            logger.info(
                f"  |-> {player.alias} ({player.name}):".ljust(40) + f" {player.role}"
            )

        return cls(1, players, config)

    @classmethod
    def load(cls, players: List[Player], config: GameConfig, state: GameState):
        logger.info("--- Loading Game ---")
        logger.info("Players: {}".format(players))
        for player in players:
            logger.info(
                f"  |-> {player.alias} ({player.name}):".ljust(40)
                + f" {player.role} {'(DEAD)' if not player.alive else ''}"
            )

        g = cls(state.day, players, config)
        g._graveyard = state.graveyard

        for actor in g.actors:
            actor.set_targets(
                [g.get_actor_by_number(target) for target in actor.player.targets]
            )

        return g

    def generate_allies_and_possible_targets(self):
        for actor in self.alive_actors:
            actor.find_allies(self.actors)
            actor.find_possible_targets(self.actors)

    def lynch(self, number: int) -> None:
        actor = self.get_actor_by_number(number)
        if not actor:
            raise ValueError("Actor not found")

        actor.lynched()

    def resolve(self):
        logger.info("--- Resolving all player actions ---")
        self.day += 1

        self.generate_allies_and_possible_targets()

        # sort the actors based on turn order
        self.actors.sort(key=lambda actor: ROLE_LIST.index(actor.__class__))

        # Prelim check to ensure that players are only targetting valid options
        # This needs to happen BEFORE resolution as Witch can then fuck with the targetting... as God intended
        for actor in self.actors:
            if not actor.targets:
                continue
            if actor.targets and not actor.possible_targets:
                logger.critical(f"{actor} invalid targets ({actor.targets})")
                logger.info("Clearing targets")
                actor.clear_targets()
                continue

            for i, target in enumerate(actor.targets):
                # For each list of possible targets, check if contains selected target
                p_targets = [p_target for p_target in actor.possible_targets[i]]
                if target in p_targets:
                    continue

                logger.critical(f"{actor} invalid targets ({target})")
                logger.info("Clearing targets")
                actor.clear_targets()
                break

        # Resolve all actions for the day
        for actor in self.actors:
            if not actor.targets or not actor.alive:
                continue

            logger.info(f"{actor} is targetting {actor.targets}")

            # Initialise events group for this action
            ACTION_EVENTS.reset(
                new_id=f"{'_'.join(actor.role_name.lower().split(' '))}_action"
            )
            actor.do_action()
            if ACTION_EVENTS.events:
                self.events.new_event_group(copy.deepcopy(ACTION_EVENTS))

        # print(self.events)
        pass

    def check_for_win(self):
        logger.info("--- Checking for win conditions ---")
        winners = [
            actor for actor in self.actors if actor.check_for_win(self.alive_actors)
        ]
        if winners:
            logger.info(f"Winners: {winners}")
            return winners
        else:
            logger.info("No winners found")
            return None

    def get_actor_by_number(self, number: int) -> Actor:
        return next((actor for actor in self.actors if actor.number == number), None)

    @property
    def alive_actors(self) -> List[Actor]:
        return [actor for actor in self.actors if actor.alive]

    @property
    def dead_actors(self) -> List[Actor]:
        # print(
        #     "DEADIED:", [actor.dump_state() for actor in self.actors if not actor.alive]
        # )
        return [actor for actor in self.actors if not actor.alive]

    @property
    def graveyard(self) -> dict:
        return self._graveyard + [
            {
                "number": actor.number,
                "alias": actor.alias,
                "cod": actor.cod,
                "dod": self.day,
                "role": actor.role_name,
                "will": "actor.will",
            }
            for actor in self.dead_actors
        ]

    @property
    def state(self) -> GameState:
        return GameState(
            **{
                "day": self.day,
                "players": [
                    {
                        "number": actor.number,
                        "alias": actor.alias,
                        "alive": actor.alive,
                    }
                    for actor in self.actors
                ],
                "graveyard": self.graveyard,
            }
        )

    def dump_state(self):
        return self.state.model_dump()

    def dump_actors(self):
        return [actor.dump_state() for actor in self.actors]
