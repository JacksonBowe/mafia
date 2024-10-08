import json

from tests.conftest import lambda_context


def test_create_lobby_success(infra):
    # Create User
    from core.tables import UserTable

    user = UserTable.Entities.User(
        id="1234-test-user",
        createdAt=0,
        username="TestUser",
        provider="discord",
        avatar="avatar",
        lastLogin=0,
    )

    UserTable.table.put_item(Item=user.serialize())

    # Create Lobby - Success
    from rest.lobbies import handler

    event = {
        "rawPath": "/lobbies",
        "body": json.dumps(
            {
                "name": "TestLobby",
            }
        ),
        "requestContext": {
            "http": {
                "method": "POST",
            },
            "authorizer": {"lambda": {"CallerID": "1234-test-user"}},
            "stage": "$default",
        },
    }
    response = handler(event, lambda_context)

    assert response["statusCode"] == 200, f"Failed to create lobby: {response}"


def test_create_lobby_fail(infra):
    # Create Lobby - Fail
    from rest.lobbies import handler

    event = {
        "rawPath": "/lobbies",
        "body": json.dumps(
            {
                "lobbyName": "TestLobby",
            }
        ),
        "requestContext": {
            "http": {
                "method": "POST",
            },
            "authorizer": {"lambda": {"CallerID": "non-existent-user"}},
            "stage": "$default",
        },
    }
    response = handler(event, lambda_context)

    assert (
        response["statusCode"] != 200
    ), f"Successfully created lobby with non-existent user: {response}"


def test_join_lobby(infra):
    from core.controllers import LobbyController
    from core.tables import LobbyTable, UserTable
    from rest.lobbies import handler

    # Create a new lobby
    lobby = LobbyTable.Entities.Lobby(
        id="test-lobby",
        createdAt=0,
        host=LobbyTable.Entities.Lobby.LobbyHost(
            id="dummy-host", username="Dummy Host"
        ),
        config="",
        name="test lobby",
    )

    LobbyTable.table.put_item(Item=lobby.serialize())

    # Join lobby
    user = UserTable.Entities.User(
        id="test-2",
        createdAt=0,
        username="TestUser",
        provider="discord",
        avatar="avatar",
        lastLogin=0,
    )

    UserTable.table.put_item(Item=user.serialize())

    event = {
        "rawPath": f"/lobbies/{lobby.id}/join",
        "requestContext": {
            "http": {
                "method": "POST",
            },
            "authorizer": {"lambda": {"CallerID": user.id}},
            "stage": "$default",
        },
    }
    response = handler(event, lambda_context)

    assert response["statusCode"] == 200, f"Failed to join lobby: {response}"

    # Now get the lobby users and confirm that user is present
    lobby_users = LobbyController.get_lobby_users(lobby.id)

    assert user.id in [
        u.id for u in lobby_users
    ], f"User not found in lobby: {lobby_users}"
