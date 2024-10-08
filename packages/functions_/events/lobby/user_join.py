import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )


from aws_lambda_powertools.utilities.data_classes import EventBridgeEvent, event_source
from core.controllers import LobbyController


@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.UserJoin.Properties(**event.detail)

    # TODO: IoT Publish
    print(f"User {details.user.username} join lobby {details.lobby.name}")

    return
