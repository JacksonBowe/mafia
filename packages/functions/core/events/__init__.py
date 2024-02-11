import os
import json

import inspect
from pathlib import Path

import boto3

from aws_lambda_powertools import Logger
from pydantic import BaseModel, ValidationError

logger = Logger()
eb = boto3.client('events')

class Event:
    event_name: str
    class Properties(BaseModel):
        pass

    @classmethod
    def publish(cls, data: dict):
        try:
            validated_data = cls.Properties(**data).model_dump_json()
            return eb.put_events(
                Entries=[
                    {
                        'Source': Path(inspect.stack()[1][1]).__str__(), # Resolves to the file that triggered the event
                        'DetailType': cls.event_name,
                        'Detail': validated_data,
                        'EventBusName': os.environ['EVENT_BUS_NAME']
                    }
                ]
            )
        except ValidationError as e:
            print(e)
            logger.exception(e)
            raise e
