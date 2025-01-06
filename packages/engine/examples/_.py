from typing import List

from engine.models import GameConfig, Player


def dummy_players(n) -> List[Player]:
    players = []
    for i in range(1, n + 1):
        players.append(
            Player(id=f"user-{i}", name=f"User{i}", alias=f"Alias{i}")
            # {"id": f"user-{i}", "name": f"UserName{i}", "alias": f"UserAlias{i}"}
        )

    return players


def dummy_config(tags=[], roles=[]):
    config = {
        "tags": [
            "town_government",
            "town_protective",
            "town_protective",
            "town_power",
            "town_investigative",
            "town_killing",
            "town_investigative",
            "town_random",
            "mafia_killing",
            "mafia_deception",
            "mafia_support",
            "neutral_evil",
            "neutral_benign",
            "neutral_random",
            "any_random",
        ],
        "settings": {},
        "roles": {
            "Citizen": {"max": 0, "weight": 0.01, "settings": {"maxVests": 2}},
            "Mayor": {"max": 0, "weight": 1, "settings": {}},
            "Doctor": {"max": 2, "weight": 1, "settings": {}},
            "Bodyguard": {"max": 2, "weight": 1, "settings": {}},
            "Escort": {"max": 0, "weight": 1, "settings": {}},
            "Sheriff": {"max": 0, "weight": 1, "settings": {}},
            "Investigator": {"max": 0, "weight": 1, "settings": {}},
            "Mafioso": {"max": 2, "weight": 1, "settings": {"promotes": False}},
            "Godfather": {"max": 1, "weight": 1, "settings": {"nightImmune": True}},
            "Consort": {"max": 0, "weight": 1, "settings": {}},
            "Survivor": {"max": 0, "weight": 1, "settings": {}},
            "SerialKiller": {"max": 0, "weight": 1, "settings": {"nightImmune": True}},
        },
    }
    # Filter tags if a specific list is provided
    if tags:
        config["tags"] = [tag for tag in config["tags"] if tag in tags]

    # Filter roles if a specific list is provided
    if roles:
        config["roles"] = {
            role: details for role, details in config["roles"].items() if role in roles
        }

    return GameConfig(**config)
