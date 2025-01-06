from typing import List

from pydantic import BaseModel, ValidationError

from engine.models import Player, GameState, GameConfig, Game
from engine.utils.logging import logger


def new_game(players: List[Player], config: GameConfig, tries=1) -> Game:
    logger.info("Creating a new game")
    for i in range(tries):
        try:
            game = Game.new(players, config)
            return game
        except ValidationError as e:
            logger.error(f"Failed to create a new game: {e}")
            continue


def hello() -> str:
    return "Hello from engine!"

    pass
