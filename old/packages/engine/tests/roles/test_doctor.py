import logging
from typing import Tuple

import pytest

from engine import models, roles


@pytest.fixture
def test_doctor_boostrap() -> (
    Tuple[roles.Citizen, roles.Bodyguard, roles.Doctor, roles.Mafioso]
):
    logging.info("--- TEST: Citizen boostrap ---")
    citizen = roles.Citizen(
        models.Player(**{"name": "A", "alias": "test_citizen", "number": 1, "id": "1"})
    )
    bodyguard = roles.Bodyguard(
        models.Player(
            **{"name": "B", "alias": "test_bodyguard", "number": 2, "id": "2"}
        )
    )
    doctor = roles.Doctor(
        models.Player(
            **{"name": "B", "alias": "test_bodyguard", "number": 3, "id": "2"}
        )
    )

    mafioso = roles.Mafioso(
        models.Player(**{"name": "C", "alias": "test_mafioso", "number": 4, "id": "3"})
    )

    logging.debug([citizen, bodyguard, doctor, mafioso])
    return citizen, bodyguard, doctor, mafioso


def test_doctor_find_targets(
    test_doctor_boostrap: Tuple[
        roles.Citizen, roles.Bodyguard, roles.Doctor, roles.Mafioso
    ],
):
    logging.info("--- TEST: Doctor find targets ---")
    citizen, bodyguard, doctor, mafioso = test_doctor_boostrap

    doctor.find_possible_targets([citizen, bodyguard, doctor, mafioso])

    print(doctor.possible_targets)
    assert len(doctor.possible_targets) == 1
    assert len(doctor.possible_targets[0]) == 3
    assert doctor not in doctor.possible_targets[0]


def test_doctor_action_simple(
    test_doctor_boostrap: Tuple[
        roles.Citizen, roles.Bodyguard, roles.Doctor, roles.Mafioso
    ],
):
    logging.info("--- TEST: Doctor heal Citizen ---")
    citizen, bodyguard, doctor, mafioso = test_doctor_boostrap

    # Verify BG applied to Citizen
    doctor.set_targets([citizen])
    doctor.do_action()

    assert citizen.alive
    assert doctor.visiting == citizen
    assert doctor in citizen.doctors

    # Verify BG defends against Mafioso
    mafioso.set_targets([citizen])
    mafioso.do_action()

    assert citizen.alive
    assert mafioso.alive
    assert bodyguard.alive
    assert doctor.alive


def test_doctor_action_complex(
    test_doctor_boostrap: Tuple[
        roles.Citizen, roles.Bodyguard, roles.Doctor, roles.Mafioso
    ],
):
    logging.info("--- TEST: Doctor heal BG shootout ---")
    citizen, bodyguard, doctor, mafioso = test_doctor_boostrap

    # Verify BG applied to Citizen
    doctor.set_targets([bodyguard])
    doctor.do_action()

    bodyguard.set_targets([citizen])
    bodyguard.do_action()

    # Verify BG defends against Mafioso
    mafioso.set_targets([citizen])
    mafioso.do_action()

    assert citizen.alive
    assert not mafioso.alive
    assert bodyguard.alive
