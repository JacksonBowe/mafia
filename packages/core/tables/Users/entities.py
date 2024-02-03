from __future__ import annotations
from pydantic import BaseModel
from abc import ABC, abstractmethod
from typing import Optional, List, Self
from enum import Enum, auto

class EntityType(Enum):
    USER = auto()

class Entity(BaseModel, ABC):
    id: str
    type: EntityType
    createdAt: int
    updates: dict = None
    
    @property
    @abstractmethod
    def PK(self) -> str:
        pass
    
    @property
    @abstractmethod
    def SK(self) -> str:
        pass
    
    def update(self, attributes: dict):
        for k,v in attributes.items():
            setattr(self, k, v)
        
    
    def serialize(self) -> dict:
        raw = self.model_dump(exclude_none=True)
        raw['PK'] = self.PK
        raw['SK'] = self.SK
        raw['type'] = self.type.value
        
        return raw
    
    @classmethod
    def deserialize(cls, data: dict) -> Self:
        [data.pop(key) for key in ['PK', 'SK']]
        print(data)
        return cls(**data)
    
class User(Entity):
    type: EntityType = EntityType.USER
    username: str
    provider: str
    avatar: Optional[str] = None
    lobby: Optional[str] = None
    game: Optional[str] = None
    roles: Optional[List[str]] = None
    lastLogin: Optional[int] = None
    
    @property
    def PK(self):
        return self.id
    
    @property
    def SK(self):
        return 'A'
    
    