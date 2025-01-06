import logging
from typing import Tuple

import pytest

from engine import models, roles


@pytest.fixture
def test_bodyguard_boostrap() -> Tuple[roles.Citizen, roles.Bodyguard, roles.Mafioso]:
    logging.info("--- TEST: Bodyguard boostrap ---")
    citizen = roles.Citizen(
        models.Player(**{"name": "A", "alias": "test_citizen", "number": 1, "id": "1"})
    )
    bodyguard = roles.Bodyguard(
        models.Player(
            **{"name": "B", "alias": "test_bodyguard", "number": 2, "id": "2"}
        )
    )
    mafioso = roles.Mafioso(
        models.Player(**{"name": "C", "alias": "test_mafioso", "number": 3, "id": "3"})
    )

    logging.debug([citizen, bodyguard, mafioso])
    return citizen, bodyguard, mafioso


def test_bodyguard_find_targets(
    test_bodyguard_boostrap: Tuple[roles.Citizen, roles.Bodyguard, roles.Mafioso],
):
    logging.info("--- TEST: Bodyguard find targets ---")
    citizen, bodyguard, mafioso = test_bodyguard_boostrap

    bodyguard.find_possible_targets([citizen, bodyguard, mafioso])

    assert len(bodyguard.possible_targets) == 1
    assert len(bodyguard.possible_targets[0]) == 2
    assert bodyguard not in bodyguard.possible_targets[0]


def test_bodyguard_action(
    test_bodyguard_boostrap: Tuple[roles.Citizen, roles.Bodyguard, roles.Mafioso],
):
    logging.info("--- TEST: Bodyguard action ---")
    citizen, bodyguard, mafioso = test_bodyguard_boostrap

    # Verify BG applied to Citizen
    bodyguard.set_targets([citizen])
    bodyguard.do_action()

    assert citizen.alive
    assert bodyguard.visiting == citizen
    assert bodyguard in citizen.bodyguards

    # Verify BG defends against Mafioso
    mafioso.set_targets([citizen])
    mafioso.do_action()

    assert citizen.alive
    assert not mafioso.alive
    assert not bodyguard.alive
