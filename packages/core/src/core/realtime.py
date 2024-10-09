import os
import json
import boto3

TOPIC_BASE = f"mafia/{os.environ['SST_STAGE']}/"


def publish_iot(topic: str, payload: dict = None, qos: int = 1) -> dict:
    iot = boto3.client("iot-data", region_name=os.environ["AWS_REGION"])
    return iot.publish(
        topic=TOPIC_BASE + topic,
        qos=qos,
        payload=payload,
    )
