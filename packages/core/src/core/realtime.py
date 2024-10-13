import json
import os
from enum import Enum

import boto3

TOPIC_BASE = f"mafia/{os.environ['SST_STAGE']}/"


class RealtimeEvent(Enum):
    # Chat Events
    CHAT_MESSAGE = "chat.message"

    # Lobby Events
    LOBBY_USER_JOIN = "lobby.user-join"
    LOBBY_USER_LEAVE = "lobby.user-leave"
    LOBBY_START = "lobby.start"
    LOBBY_TERMINATE = "lobby.terminate"
    LOBBY_NEW_HOST = "lobby.new-host"

    # Game Events
    # TODO: Add game events


def publish_iot(
    topic: str, event_type: RealtimeEvent, payload: dict = None, qos: int = 1
) -> dict:
    iot = boto3.client("iot-data", region_name=os.environ["AWS_REGION"])
    return iot.publish(
        topic=TOPIC_BASE + topic,
        qos=qos,
        payload=json.dumps(
            {
                "type": event_type.value,
                "properties": payload,
            }
        ),
    )
