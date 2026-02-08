from __future__ import annotations

import os
from enum import Enum

import boto3
from aws_lambda_powertools.utilities.parser import BaseModel
from core.utils.dynamo import CompositeEntity

table_name = os.environ.get("SST_TABLE_TABLENAME_LOBBYTABLE")
if table_name:
    ddb = boto3.resource("dynamodb")
    table = ddb.Table(table_name)


class Indexes(Enum):
    ITEMS_BY_TYPE = "itemsByType"


class EntityType(Enum):
    LOBBY = "LOBBY"
    LOBBY_USER = "LOBBY_USER"


class Entities:
    class BaseEntity(CompositeEntity):
        id: str
        type: EntityType
        createdAt: int

        # class ConfigDict:
        #     validate_assignment = True

    class Lobby(BaseEntity):
        host: LobbyHost
        config: str
        name: str
        type: EntityType = EntityType.LOBBY

        class LobbyHost(BaseModel):
            id: str
            username: str

        @property
        def PK(self):
            return self.id

        @property
        def SK(self):
            return "A"

    class LobbyUser(BaseEntity):
        username: str
        lobbyId: str
        type: EntityType = EntityType.LOBBY_USER

        @property
        def PK(self):
            return self.lobbyId

        @property
        def SK(self):
            return f"LU#{self.id}"
