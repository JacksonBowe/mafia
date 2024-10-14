import json
from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from core.controllers import LobbyController
from core.realtime import RealtimeEvent, publish_iot


@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.UserJoin.Properties(**event.detail)

    print(f"User {details.user.username} join lobby {details.lobby.name}")

    publish_iot(
        details.lobby.id,
        RealtimeEvent.LOBBY_USER_JOIN,
        json.loads(details.user.model_dump_json()),
    )

    return
