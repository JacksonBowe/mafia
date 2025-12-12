import logging
from typing import Tuple

import pytest

from engine import models, roles


@pytest.fixture
def test_actor_boostrap() -> Tuple[roles.Citizen, roles.Citizen, roles.Mafioso]:
    logging.info("--- TEST: Actor bootstrap ---")
    citizen_1 = roles.Citizen(
        models.Player(
            **{"name": "A", "alias": "test_citizen_1", "number": 1, "id": "1"}
        )
    )
    citizen_2 = roles.Citizen(
        models.Player(
            **{"name": "B", "alias": "test_citizen_2", "number": 2, "id": "2"}
        )
    )
    mafioso_1 = roles.Mafioso(
        models.Player(
            **{"name": "C", "alias": "test_mafioso_1", "number": 3, "id": "3"}
        )
    )

    logging.debug([citizen_1, citizen_2, mafioso_1])
    return citizen_1, citizen_2, mafioso_1


def test_actor_night_immune(
    test_actor_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Actor night immune ---")
    citizen_1, citizen_2, mafioso_1 = test_actor_boostrap

    citizen_1.night_immune = True

    mafioso_1.set_targets([citizen_1])
    mafioso_1.do_action()

    assert citizen_1.alive


def test_actor_visit(
    test_actor_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Actor visit ---")
    citizen_1, citizen_2, mafioso_1 = test_actor_boostrap

    mafioso_1.visit(citizen_1)

    assert mafioso_1 in citizen_1.visitors
    assert mafioso_1.visiting == citizen_1


def test_actor_die(
    test_actor_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Actor die ---")
    citizen_1, citizen_2, mafioso_1 = test_actor_boostrap

    citizen_1.die("Killed by God")

    assert citizen_1.alive == False
    assert citizen_1.cod == "Killed by God"
