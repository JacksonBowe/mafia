import logging
from typing import Tuple

import pytest

from engine import models, roles


@pytest.fixture
def test_citizen_boostrap() -> Tuple[roles.Citizen, roles.Citizen, roles.Mafioso]:
    logging.info("--- TEST: Citizen boostrap ---")
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


def test_citizen_find_targets(
    test_citizen_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Citizen find targets ---")
    citizen_1, citizen_2, mafioso_1 = test_citizen_boostrap

    citizen_1.find_possible_targets([citizen_2, mafioso_1])

    assert len(citizen_1.possible_targets) == 1
    assert len(citizen_1.possible_targets[0]) == 1
    assert citizen_1.possible_targets[0][0] == citizen_1


def test_citizen_find_allies(
    test_citizen_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Citizen find allies ---")
    citizen_1, citizen_2, mafioso_1 = test_citizen_boostrap

    citizen_1.find_allies([citizen_1, citizen_2, mafioso_1])
    assert len(citizen_1.allies) == 0


def test_citizen_action(
    test_citizen_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Citizen action ---")
    citizen_1, citizen_2, mafioso_1 = test_citizen_boostrap

    vests_before = citizen_1.remaining_vests
    citizen_1.set_targets([citizen_1])
    citizen_1.do_action()

    assert citizen_1.night_immune
    assert citizen_1.remaining_vests == vests_before - 1


def test_citizen_win(
    test_citizen_boostrap: Tuple[roles.Citizen, roles.Citizen, roles.Mafioso],
):
    logging.info("--- TEST: Citizen win ---")
    citizen_1, citizen_2, mafioso_1 = test_citizen_boostrap

    # Test no win
    win = citizen_1.check_for_win([citizen_1, citizen_2, mafioso_1])
    assert not win, "Citizen should not win unless direct tie"

    # Test faction win
    win = citizen_1.check_for_win([citizen_1, citizen_2])
    assert win, "Citizen should inherit faction win"

    # Test win tie
    win = citizen_1.check_for_win([citizen_1, mafioso_1])
    assert win, "Citizen should win ties"
