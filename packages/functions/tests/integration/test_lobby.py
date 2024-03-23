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
