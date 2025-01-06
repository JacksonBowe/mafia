import logging
from typing import Tuple

import pytest

from engine import models, roles


@pytest.fixture
def test_godfather_boostrap() -> (
    Tuple[roles.Citizen, roles.Godfather, roles.Mafioso, roles.Doctor]
):
    logging.info("--- TEST: Godfather boostrap ---")
    citizen = roles.Citizen(
        models.Player(**{"name": "A", "alias": "test_citizen", "number": 1, "id": "1"})
    )
    godfather = roles.Godfather(
        models.Player(
            **{"name": "B", "alias": "test_godfather", "number": 2, "id": "2"}
        )
    )
    mafioso = roles.Mafioso(
        models.Player(**{"name": "C", "alias": "test_mafioso", "number": 3, "id": "3"})
    )

    doctor = roles.Doctor(
        models.Player(**{"name": "C", "alias": "test_doctor", "number": 4, "id": "4"})
    )

    logging.debug([citizen, godfather, mafioso, doctor])
    return citizen, godfather, mafioso, doctor


def test_godfather_find_targets(
    test_godfather_boostrap: Tuple[
        roles.Citizen, roles.Godfather, roles.Mafioso, roles.Doctor
    ],
):
    logging.info("--- TEST: Godfather find targets ---")
    citizen, godfather, mafioso, doctor = test_godfather_boostrap

    godfather.find_possible_targets([citizen, godfather, mafioso, doctor])

    assert len(godfather.possible_targets) == 1
    assert len(godfather.possible_targets[0]) == 2
    assert citizen in godfather.possible_targets[0]
    assert doctor in godfather.possible_targets[0]


def test_godfather_action_proxy(
    test_godfather_boostrap: Tuple[
        roles.Citizen, roles.Godfather, roles.Mafioso, roles.Doctor
    ],
):
    logging.info("--- TEST: Godfather find targets ---")
    citizen, godfather, mafioso, doctor = test_godfather_boostrap

    godfather.find_allies([citizen, godfather, mafioso, doctor])

    godfather.set_targets([citizen])
    godfather.do_action()

    assert godfather.visiting is None
    assert godfather not in mafioso.visitors
    assert godfather not in citizen.visitors

    mafioso.do_action()

    assert mafioso.visiting == citizen

    assert not citizen.alive


def test_godfather_action_success(
    test_godfather_boostrap: Tuple[
        roles.Citizen, roles.Godfather, roles.Mafioso, roles.Doctor
    ],
):
    logging.info("--- TEST: Godfather find targets ---")
    citizen, godfather, mafioso, doctor = test_godfather_boostrap

    godfather.set_targets([citizen])
    godfather.do_action()

    assert godfather.visiting == citizen
    assert godfather in citizen.visitors

    assert not citizen.alive


def test_godfather_action_fail(
    test_godfather_boostrap: Tuple[
        roles.Citizen, roles.Godfather, roles.Mafioso, roles.Doctor
    ],
):
    logging.info("--- TEST: Godfather find targets ---")
    citizen, godfather, mafioso, doctor = test_godfather_boostrap

    citizen.night_immune = True

    godfather.set_targets([citizen])
    godfather.do_action()

    assert godfather.visiting == citizen
    assert godfather in citizen.visitors

    assert citizen.alive
