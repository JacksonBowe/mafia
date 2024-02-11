import os
import boto3
from enum import Enum

from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError
)

import core.tables.Lobby.entities as entities

ddb = boto3.resource('dynamodb')
try:
    table_name = os.environ['SST_TABLE_TABLENAME_LOBBYTABLE']
    table = ddb.Table(table_name)
except KeyError:
    print("Table not bound")
    pass
    # TODO: Figure this shit out
    # raise InternalServerError("Environment variable 'APP_LOBBY_TABLE_NAME' not set")

class Indexes(Enum):
    ITEMS_BY_TYPE = 'itemsByType'