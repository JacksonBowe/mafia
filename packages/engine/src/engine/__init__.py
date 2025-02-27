from typing import List

from pydantic import BaseModel, ValidationError

from engine.models import Game, GameConfig, GameState, Player
from engine.utils.logging import logger


def new_game(players: List[Player], config: GameConfig, tries=1) -> Game:
    for i in range(tries):
        try:
            game = Game.new(players, config)
            return game
        except ValidationError as e:
            logger.error(f"Failed to create a new game: {e}")
            continue  # TODO: This is a temporary solution, we should handle this better


def load_game(players: List[Player], config: GameConfig, state: GameState) -> Game:
    return Game.load(players, config, state)
