from typing import Any, List, Mapping, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Player(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    alias: str
    role: Optional[str] = None
    number: Optional[int] = None
    alive: Optional[bool] = True
    possible_targets: Optional[List[List[int]]] = Field(
        default_factory=list, max_length=2, alias="possibleTargets"
    )
    targets: Optional[List[int]] = Field(default_factory=list, max_length=15)
    allies: Optional[List[dict]] = Field(default_factory=list, max_length=15)
    role_actions: Optional[Mapping[str, Any]] = Field(
        default_factory=dict, alias="roleActions"
    )

    @field_validator("number")
    @classmethod
    def validate_number(cls, v):
        if not (1 <= v <= 15):
            raise ValueError("Number must be between 1 and 15 inclusive")
        return v

    @field_validator("targets")
    @classmethod
    def validate_target_lists(cls, v):
        for el in v:
            if not (1 <= el <= 15):
                raise ValueError("All values must be between 1 and 15 inclusive")
        return v

    @field_validator("possible_targets")
    @classmethod
    def validate_possible_targets(cls, v):
        if len(v) > 2:
            raise ValueError("possible_targets list cannot have more than 2 lists")
        for sublist in v:
            if len(sublist) > 15:
                raise ValueError(
                    "Sublists in possible_targets cannot have more than 15 items"
                )

            if any(not (1 <= item <= 15) for item in sublist):
                raise ValueError("All values must be between 1 and 15 inclusive")
        return v
