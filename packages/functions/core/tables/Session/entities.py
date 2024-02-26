from typing import Self
from datetime import datetime
from aws_lambda_powertools.utilities.parser import BaseModel


class Session(BaseModel):
    userId: str
    accessToken: str
    refreshToken: str
    expiresAt: int
    
    def serialize(self) -> dict:
        raw = self.model_dump()
        return raw
    
    @classmethod
    def deserialize(cls, data: dict) -> Self:
        return cls(**data)  