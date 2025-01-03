import json
from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from core.controllers import LobbyController
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

    # if anything goes wrong terminate the Lobby and return
    return
