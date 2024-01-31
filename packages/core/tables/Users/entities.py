from __future__ import annotations
from pydantic import BaseModel
from abc import ABC, abstractmethod
from typing import Optional, List

class Entity(BaseModel, ABC):
    entityId: str
    entityType: str
    createdAt: int
    
    @property
    @abstractmethod
    def PK(self) -> str:
        pass
    
    @property
    @abstractmethod
    def SK(self) -> str:
        pass
    
    @abstractmethod
    def serialize(self) -> dict:
        pass
    
    @classmethod
    @abstractmethod
    def deserialize(cls) -> Entity:
        pass
    
class User(Entity):
    type: str = 'USER'
    username: str
    avatar: str
    provider: str
    lobby: Optional[str]
    game: Optional[str]
    roles: Optional[List[str]]
    
    