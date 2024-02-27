import os
import boto3
from typing import Self
from enum import Enum
from aws_lambda_powertools.utilities.parser import BaseModel

from core.utils.dynamo import Table

class SessionTable(Table):
    def __init__(self):
        super().__init__(os.environ['SST_TABLE_TABLENAME_SESSIONTABLE'])
        
        
    class Indexes(Enum):
        ITEMS_BY_EXPIRES_AT = 'itemsByExpiresAt'

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