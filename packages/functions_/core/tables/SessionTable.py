import os
from enum import Enum
from typing import Self

import boto3
from aws_lambda_powertools.utilities.parser import BaseModel

table_name = os.environ.get("SST_TABLE_TABLENAME_SESSIONTABLE")
if table_name:
    ddb = boto3.resource("dynamodb")
    table = ddb.Table(table_name)


class Indexes(Enum):
    ITEMS_BY_EXPIRES_AT = "itemsByExpiresAt"


class Entities:
    class BaseEntity(BaseModel):
        def serialize(self) -> dict:
            raw = self.model_dump()
            return raw

        @classmethod
        def deserialize(cls, data: dict) -> Self:
            return cls(**data)

    class Session(BaseEntity):
        userId: str
        accessToken: str
        refreshToken: str
        expiresAt: int
