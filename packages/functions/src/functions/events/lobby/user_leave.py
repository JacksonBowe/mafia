import json

from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from core.controllers import LobbyController
from core.realtime import RealtimeEvent, publish_iot


@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.UserLeave.Properties(**event.detail)

    print(f"User {details.user.username} removed from lobby {details.lobby.id}")

    publish_iot(
        details.lobby.id,
        RealtimeEvent.LOBBY_USER_LEAVE,
        json.loads(details.user.model_dump_json()),
    )

    lobby_users = LobbyController.get_lobby_users(details.lobby.id)

    if not lobby_users:
        LobbyController.delete_lobby(details.lobby)
        print(f"Lobby {details.lobby.id} deleted")

    return
