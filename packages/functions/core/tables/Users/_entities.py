from __future__ import annotations
from pydantic import BaseModel, ValidationError
from abc import ABC, abstractmethod
from typing import Optional, List, Self
from enum import Enum

from core.utils import collapse_dict

class EntityType(Enum):
    USER = 'USER'

class Entity(BaseModel, ABC):
    id: str
    type: EntityType
    createdAt: int
    _updated_attributes: dict = dict()
    
    class ConfigDict:
        validate_assignment = True
    
    @property
    @abstractmethod
    def PK(self) -> str:
        pass
    
    @property
    @abstractmethod
    def SK(self) -> str:
        pass
    
    def _update_attribute(self, current_object, attribute_parts, value):
        """
        Helper method to recursively update an attribute with a given value.

        Args:
            current_object: Current object being processed.
            attribute_parts (list): List of attribute parts (nested keys).
            value: New value for the attribute.
        """
        if len(attribute_parts) == 1:
            # Reached the final part of the attribute, set the value
            if isinstance(current_object, dict):
                # If the current object is a dictionary, set the value using dict[key] syntax
                current_object[attribute_parts[0]] = value
            elif isinstance(current_object, BaseModel):
                # Otherwise, use setattr for class instances
                setattr(current_object, attribute_parts[0], value)
            else:
                raise Exception(f'Unsupported update type: {current_object}')
        else:
            # Move deeper into the nested structure
            nested_object = getattr(current_object, attribute_parts[0], None)

            if nested_object is None:
                # Create a new nested object if it doesn't exist
                nested_object = {}
                setattr(current_object, attribute_parts[0], nested_object)

            # Recursively update the nested attribute
            self._update_attribute(nested_object, attribute_parts[1:], value)

    def update(self, values):
        """
        Update attributes with values from the given dictionary.

        Args:
            values (dict): Dictionary of attribute values.
        """
        values = collapse_dict(values)
        for key, value in values.items():
            attribute_parts = key.split('.')
            # Start the recursive update from the current instance
            self._update_attribute(self, attribute_parts, value)
            # Keep track of updated attributes
            self._updated_attributes[key] = value
        
    
    def serialize(self) -> dict:
        raw = self.model_dump(exclude_none=True)
        raw['PK'] = self.PK
        raw['SK'] = self.SK
        raw['type'] = self.type.value
        
        return raw
    
    @classmethod
    def deserialize(cls, data: dict) -> Self:
        [data.pop(key) for key in ['PK', 'SK']]
        return cls(**data)
    
class User(Entity):
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
        return 'A'
    
    