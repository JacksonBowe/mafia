import os
import boto3

from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError
)

import core.tables.Lobby.entities as entities

ddb = boto3.resource('dynamodb')
try:
    table_name = os.environ['APP_LOBBY_TABLE_NAME']
    table = ddb.Table(table_name)
except KeyError:
    raise InternalServerError("Environment variable 'APP_LOBBY_TABLE_NAME' not set")