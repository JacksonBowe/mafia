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
    print("LobbyTable not bound")
    raise InternalServerError("LobbyTable not bound")

class Indexes(Enum):
    ITEMS_BY_TYPE = 'itemsByType'