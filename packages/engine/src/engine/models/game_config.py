import random
from typing import List, Mapping
from annotated_types import Ge
from typing_extensions import Annotated

from pydantic import BaseModel

from engine.utils.logging import logger
from engine.roles import ROLE_TAGS_MAP


class GameSettings(BaseModel):
    pass


class RoleSettings(BaseModel):
    max: Annotated[int, Ge(0)]
    weight: Annotated[float, Ge(0)]
    settings: dict = {}


class GameConfig(BaseModel):
    tags: List[str]  # TODO: Make this strict
    settings: dict  # TODO: Make this strict
    roles: Mapping[str, RoleSettings]  # TODO: Make this strict

    def generate_roles(self):
        logger.info("--- Generating roles ---")
        logger.info("Tags: {}".format(self.tags))

        failed_roles = []

        # Construct a list of all possible options for each spefified tag
        role_options = []
        for tag in self.tags:
            possible_roles = []
            for role, settings in self.roles.items():
                if (
                    role in ROLE_TAGS_MAP and tag in ROLE_TAGS_MAP[role]
                ) or tag == role:
                    possible_roles.append((role, settings.weight, settings.max))
            role_options.append((tag, possible_roles))

        # Sort the (tag, [roles]) tuples by increasing len([roles]),
        # this means that tags with only a single valid valid outcome have a higher chance of succeeding
        role_options = sorted(
            role_options, key=lambda option: (len(option[1]) == 0, len(option[1]))
        )
        logger.debug(role_options)
        # Loop through and select roles
        selected_roles = []
        blacklist = []

        for option in role_options:
            # 'option' = ('town_random', [('citizen', 5, 1), ('doctor', 1, 4)])
            #          = (tag, [(role, weight, max), etc...])

            # Update the blacklist
            for role, settings in self.roles.items():
                if selected_roles.count(role) == settings.max and role not in blacklist:
                    logger.info(
                        f"- Max reached for '{role}'".ljust(40)
                        + " -> adding to blacklist"
                    )
                    blacklist.append(role)
                    # Remove the role from all remaining options
                    for option_index, role_option in enumerate(role_options):
                        for role_index, remaining_role in enumerate(role_option[1]):
                            if remaining_role[0] == role:
                                logger.info(
                                    "-- Deleting role '{}' from '{}'".format(
                                        role_options[option_index][1][role_index][0],
                                        role_options[option_index][0],
                                    )
                                )
                                del role_options[option_index][1][role_index]

            # sort again
            role_options = sorted(
                role_options, key=lambda option: (len(option[1]) == 0, len(option[1]))
            )

            # remove roles that are in the blacklist
            available_roles = [
                role for role in role_options[0][1] if role[0] not in blacklist
            ]

            # Pick a weighted random choice
            roles = [option[0] for option in available_roles]
            weights = [option[1] for option in available_roles]

            # for i in range(100):
            if len(available_roles) == 0:
                # logger.info("\tUnable to select free role, failing to 'citizen'")
                choice = "Citizen"
                logger.warning(
                    f"Picking {role_options[0][0]}: {choice}".ljust(40)
                    + " <--- FAILED!!!"
                )
                failed_roles.append(role_options[0][0])
            else:
                choice = random.choices(roles, weights=weights, k=1)[0]
                logger.info(f"Picking {role_options[0][0]}: {choice}")

            selected_roles.append(choice)

            del role_options[0]  # Remove the tag from the list

        if len(failed_roles) > 0:
            logger.warning(f"Number of failures: {len(failed_roles)}")
        logger.info(f"Roles: {selected_roles}")
        return selected_roles, failed_roles
