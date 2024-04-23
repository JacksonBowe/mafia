import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json

from aws_lambda_powertools.utilities.data_classes import SNSEvent, event_source
from aws_lambda_powertools.utilities.parser import BaseModel, Field
from core.controllers import LobbyController, UserController


class DisconnectPayload(BaseModel):
    client_id: str = Field(alias="clientId")


@event_source(data_class=SNSEvent)
def disconnect(event: SNSEvent, context):
    # Multiple records can be delivered in a single event
    for record in event.records:
        message = DisconnectPayload.model_validate_json(record.sns.message)
        # Get the disconneting user
        user = UserController.get_user_by_id(message.client_id)

        # If the user is in a lobby, remove them
        if user.lobby:
            lobby = LobbyController.get_lobby_by_id(user.lobby)
            LobbyController.remove_user_from_lobby(user, lobby)

        # If the user is in a game, remove them
        if user.game:
            # game = GameController.get_game_by_id(user.game)
            # GameController.remove_user_from_game(user, game)
            pass
