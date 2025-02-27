from __future__ import annotations

import os
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Mappying, Self

import boto3
from aws_lambda_powertools.utilities.parser import BaseModel
from core.utils import collapse_dict
from core.utils.dynamo import CompositeEntity

table_name = os.environ.get("SST_TABLE_TABLENAME_GAMETABLE")
if table_name:
    ddb = boto3.resource("dynamodb")
    table = ddb.Table(table_name)

# class Indexes(Enum):
# ITEMS_BY_TYPE = "itemsByType"


class EntityType(Enum):
    GAME = "GAME"
    GAME_STATE = "GAME_STATE"
    GAME_ACTOR = "GAME_ACTOR"


class Entities:
    class BaseEntity(CompositeEntity):
        id: str
        createdAt: int
        type: EntityType

    class Game(BaseEntity):
        type: EntityType = EntityType.GAME
        config: str
        state: str

        @property
        def PK(self) -> str:
            return self.id

        @property
        def SK(self) -> str:
            return "A"

    class GameActor(BaseEntity):
        id: str
        gameId: str
        type: EntityType = EntityType.GAME_ACTOR
        role: str
        state: str

        @property
        def PK(self) -> str:
            return self.gameId

        @property
        def SK(self) -> str:
            return f"GA#{self.id}"
