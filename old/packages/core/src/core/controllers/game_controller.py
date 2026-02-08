import json
from typing import List

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError,
    NotFoundError,
    BadRequestError,
)

from core.tables import LobbyTable, GameTable
import engine


def create_game_from_lobby(
    lobby: LobbyTable.Entities.Lobby, users: List[LobbyTable.Entities.LobbyUser]
) -> None:
    players = [
        {
            "id": user.id,
            "name": user.username,
            "alias": user.username,
        }
        for user in users
    ]

    engine_game = engine.new_game(players, lobby.config)
    ddb_game = GameTable.Entities.Game(
        id=lobby.id,
        config=json.dumps(lobby.config.dict()),
        state=json.dumps(engine_game.dump_state()),
    )
