import json
from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from core.controllers import LobbyController, GameController
from core.realtime import RealtimeEvent, publish_iot


@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.LobbyStart.Properties(**event.detail)

    print(f"Lobby {details.lobby.name} started")

    publish_iot(
        details.lobby.id,
        RealtimeEvent.LOBBY_START,
        None,
    )

    # Create a Game from the Lobby
    try:
        GameController.create_game_from_lobby(details.lobby, details.lobby.users)
    except Exception as e:
        print(f"Failed to create game from lobby {details.lobby.id}")
        LobbyController.terminate_lobby(details.lobby)
    # if anything goes wrong terminate the Lobby and return

    # TODO: Remove all users from the Lobby
    return
