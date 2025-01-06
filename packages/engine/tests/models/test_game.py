import logging
import random
from typing import List, Tuple

import pytest
from conftest import dummy_config, dummy_players
from engine import Game, GameConfig, GameState, Player
from engine.roles.actor import Alignment


@pytest.fixture
def test_new_game():
    logging.info("--- TEST: New game ---")
    players = dummy_players(15)
    config = dummy_config()

    game = Game.new(players, config)

    assert game is not None
    assert len(game.graveyard) == 0
    assert len(game.actors) == 15

    assert len(game.events.events) == 0, "Game's should start with no events"

    return players, config, game


def test_dump_actors(test_new_game: Tuple[List[dict], dict, Game]):
    logging.info("--- TEST: Game dump actors ---")
    players, config, game = test_new_game
    actors_state = [actor.dump_state() for actor in game.actors]

    assert len(actors_state) == len(players)


def test_dump_state(test_new_game: Tuple[List[dict], dict, Game]):
    logging.info("--- TEST: Game dump state ---")

    _, _, game = test_new_game
    game_state = game.dump_state()

    # Test the GameState
    assert game_state["day"] == 1
    assert len(game_state["graveyard"]) == 0
    assert len(game_state["players"]) == len(game.actors)

    for player in game_state["players"]:
        actor = game.get_actor_by_number(player["number"])
        assert actor
        assert player["alive"] == actor.alive


def test_load_game(test_new_game: Tuple[List[dict], dict, Game]):
    logging.info("--- TEST: Load game ---")

    players, config, game = test_new_game

    game = Game.load(players, config, game.state)

    assert len(game.actors) == len(players)


def test_lynch(test_new_game: Tuple[List[dict], dict, Game]):
    logging.info("--- TEST: Lynch ---")
    _, _, game = test_new_game

    actor = random.choice(game.alive_actors)
    game.lynch(actor.number)

    assert not actor.alive, "Actor should be dead"
    assert actor in game.dead_actors, "Actor should be in dead actors"
    assert actor.number in [
        corpse["number"] for corpse in game.graveyard
    ], "Actor should be in graveyard"
    assert actor not in game.alive_actors, "Actor should not be in alive actors"


def test_game_resolve_no_win():
    logging.info("--- TEST: Game resolve no win ---")
    players = [
        {
            "id": "user-2",
            "name": "UserName2",
            "alias": "UserAlias2",
            "role": "Mafioso",
            "number": 1,
            "alive": True,
            "targets": [3],
        },
        {
            "id": "user-3",
            "name": "UserName3",
            "alias": "UserAlias3",
            "role": "Mafioso",
            "number": 2,
            "alive": True,
            "targets": [3],
        },
        {
            "id": "user-1",
            "name": "UserName1",
            "alias": "UserAlias1",
            "role": "Citizen",
            "number": 3,
            "alive": True,
            "targets": [3],
            "roleActions": {"remainingVests": 2},
        },
    ]
    state = {
        "day": 1,
        "players": [
            {"number": 1, "alias": "UserAlias2", "alive": True},
            {"number": 2, "alias": "UserAlias3", "alive": True},
            {"number": 3, "alias": "UserAlias1", "alive": True},
        ],
        "graveyard": [],
    }

    config = {
        "tags": ["town_government", "mafia_killing", "any_random", "town_killing"],
        "settings": {},
        "roles": {
            "Citizen": {"max": 0, "weight": 0.01, "settings": {"maxVests": 2}},
            "Mafioso": {"max": 2, "weight": 1, "settings": {"promotes": False}},
        },
    }

    players = [Player(**player) for player in players]
    config = GameConfig(**config)
    state = GameState(**state)
    game = Game.load(players, config, state)

    game.resolve()

    winners = game.check_for_win()

    assert winners is None, "There should be no winners"


def test_game_resolve_town_win():
    logging.info("--- TEST: Game resolve Town win ---")
    players = [
        {
            "id": "user-2",
            "name": "UserName2",
            "alias": "UserAlias2",
            "role": "Bodyguard",
            "number": 1,
            "alive": True,
            "targets": [3],
        },
        {
            "id": "user-3",
            "name": "UserName3",
            "alias": "UserAlias3",
            "role": "Mafioso",
            "number": 2,
            "alive": True,
            "targets": [3],
        },
        {
            "id": "user-1",
            "name": "UserName1",
            "alias": "UserAlias1",
            "role": "Citizen",
            "number": 3,
            "alive": True,
            "targets": [],
            "roleActions": {"remainingVests": 2},
        },
    ]

    state = {
        "day": 1,
        "players": [
            {"number": 1, "alias": "UserAlias2", "alive": True},
            {"number": 2, "alias": "UserAlias3", "alive": True},
            {"number": 3, "alias": "UserAlias1", "alive": True},
        ],
        "graveyard": [],
    }

    config = {
        "tags": ["town_government", "mafia_killing", "any_random", "town_killing"],
        "settings": {},
        "roles": {
            "Citizen": {"max": 0, "weight": 0.01, "settings": {"maxVests": 2}},
            "Bodyguard": {"max": 1, "weight": 1},
            "Mafioso": {"max": 2, "weight": 1, "settings": {"promotes": False}},
        },
    }

    players = [Player(**player) for player in players]
    config = GameConfig(**config)
    state = GameState(**state)
    game = Game.load(players, config, state)

    game.resolve()

    winners = game.check_for_win()
    print(winners)
    assert len(winners) == 2
    for winner in winners:
        assert winner.alignment is Alignment.TOWN


def test_load_unbalanced():
    pass
