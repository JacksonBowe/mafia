from typing import List

from engine.roles.actor import Actor
from engine.roles.bodyguard import Bodyguard
from engine.roles.citizen import Citizen
from engine.roles.doctor import Doctor
from engine.roles.godfather import Godfather
from engine.roles.mafioso import Mafioso
from engine.utils import class_for_name

# This is also turn order
ROLE_LIST: List[Actor] = [
    # ---   Role Blocking       --- #
    # ---   Self Protecting     --- #
    Citizen,
    # ---   Target Protecting   --- #
    Doctor,
    Bodyguard,
    # ---   Killing             --- #
    Godfather,
    Mafioso,
    # ---   Investigative       --- #
]

ROLE_TAGS_MAP = {role.__name__: role.tags for role in ROLE_LIST}


def import_role(role_name: str):
    return class_for_name("engine.roles", role_name)
