import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
from core.utils.game import DEFAULT_GAME_CONFIG
from core.controllers import UserController, LobbyController


def handler(event, context):
    # Terminate all existing lobbies
    lobbies = LobbyController.get_lobbies(with_users=True)
    for lobby in lobbies:
        for user in lobby.users:
            LobbyController.remove_user_from_lobby(
                UserController.get_user_by_id(user.id), lobby
            )

    # Add all seed users to new lobbies
    users = UserController.get_users()
    seed_users = [user for user in users if user.provider == "seed"]

    lobbies = []
    for i in range(1, len(seed_users)):
        user = seed_users[i]

        if i < 4:
            lobby = LobbyController.create_lobby(
                name=f"Seed Lobby {i}", host=user, config=DEFAULT_GAME_CONFIG
            )
            # lobby = f"Seed Lobby {i}"
            lobbies.append(lobby)

            print("Seeded lobby", i)
        else:
            LobbyController.add_user_to_lobby(user, random.choice(lobbies))
            # print(f"Adding user {user.id} to lobby", random.choice(lobbies))

    return event
