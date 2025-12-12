import logging
import random
from typing import List, Tuple

from conftest import dummy_config, dummy_players

import pytest
import engine


def test_new_game():
    players = dummy_players(3)
    config = dummy_config(roles=["Citizen", "Bodyguard", "Mafioso"])

    game = engine.new_game(players, config)

    assert game


def test_load_game():
    pass


def test_load_and_lynch():
    pass


def test_load_unbalanced():
    pass
