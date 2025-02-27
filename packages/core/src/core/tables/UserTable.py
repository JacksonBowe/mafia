from __future__ import annotations

import os
from enum import Enum
from typing import List, Optional

import boto3
from core.utils.dynamo import CompositeEntity

table_name = os.environ.get("SST_TABLE_TABLENAME_USERTABLE")
if table_name:
    ddb = boto3.resource("dynamodb")
    table = ddb.Table(table_name)


class Indexes:
    pass


class EntityType(Enum):
    USER = "USER"


class Entities:
    class BaseEntity(CompositeEntity):
        id: str
        type: EntityType
        createdAt: int

        # class ConfigDict:
        #     validate_assignment = True

    class User(BaseEntity):
        type: EntityType = EntityType.USER
        username: str
        provider: str
        avatar: Optional[str] = None
        lobby: Optional[str] = None
        game: Optional[str] = None
        roles: Optional[List[str]] = None
        lastLogin: int = None

        @property
        def PK(self):
            return self.id

        @property
        def SK(self):
            return "A"
