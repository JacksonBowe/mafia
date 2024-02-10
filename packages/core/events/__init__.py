import os
import json

import boto3

from aws_lambda_powertools import Logger
from typing import Type, Dict
from pydantic import BaseModel, ValidationError

logger = Logger()
eb = boto3.client('events')

class Event:
    def __init__(self, event_name: str, validator: Type[BaseModel]):
        self.event_name = event_name
        self.validator = validator

    def publish(self, data: dict):
        try:
            eb.put_events(
                Entries=[
                    {
                        'Source': __name__,
                        'DetailType': self.event_name,
                        'Detail': self.validator(**data).model_dump_json(),
                        'EventBusName': os.environ['EVENT_BUS_NAME']
                    }
                ]
            )
        except ValidationError as e:
            logger.exception(e)
        
def _create_validator(fields: Dict[str, type]):
    class Validator(BaseModel):
        __annotations__ = fields
    return Validator
        
def event(event_name, fields: Dict[str, type]):
    validator = _create_validator(fields)
    return Event(event_name, validator)