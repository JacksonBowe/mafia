import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.controllers import UserController, LobbyController


def handler(event, context):
    real_user_id = "111786544246886400"
    # Get all users
    users = UserController.get_users()
    # Find the lobby with the current test account
    user = next((user for user in users if user.id == real_user_id), None)
    if not user:
        print("No user with provided ID found")
        return
    elif not user.lobby:
        print("Test user is not currently in a lobby")
        return

    # Find a seeded user that is not currently in a lobby
    seeded_user = next(
        (user for user in users if user.lobby and user.id != real_user_id),
        None,
    )

    print(seeded_user)
