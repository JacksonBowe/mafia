from typing import List
from pydantic import BaseModel, ConfigDict


class StatePlayer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    number: int
    alias: str
    alive: bool


class StateGraveyardRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    number: int
    alias: str
    cod: str
    dod: int
    role: str
    will: str


class GameState(BaseModel):
    model_config = ConfigDict(extra="forbid")
    day: int = 0
    players: List[StatePlayer] = []
    graveyard: List[StateGraveyardRecord] = []
