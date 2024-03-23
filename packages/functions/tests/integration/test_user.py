from tests.conftest import lambda_context


def test_get_user(infra):
    # Create User
    from core.controllers import UserController
    from core.utils.auth import DiscordUser

    d_user = DiscordUser(id="1234-test-user", avatar="avatar", username="TestUser")

    response = UserController.discord_post_auth_create_user(d_user)

    assert (
        response["ResponseMetadata"]["HTTPStatusCode"] == 200
    ), f"Failed to create user: {response}"

    # Get User
    from rest.users import handler

    event = {
        "rawPath": "/users/1234-test-user",
        "requestContext": {
            "http": {
                "method": "GET",
            },
            "stage": "$default",
        },
    }

    response = handler(event, lambda_context)

    assert response["statusCode"] == 200, f"Failed to get user: {response}"


def test_get_me(infra):
    # Create User
    from core.controllers import UserController
    from core.utils.auth import DiscordUser

    d_user = DiscordUser(id="1234-test-user", avatar="avatar", username="TestUser")

    response = UserController.discord_post_auth_create_user(d_user)

    assert (
        response["ResponseMetadata"]["HTTPStatusCode"] == 200
    ), f"Failed to create user: {response}"

    # Get Me
    from rest.users import handler

    event = {
        "rawPath": "/users/me",
        "requestContext": {
            "http": {
                "method": "GET",
            },
            "authorizer": {"lambda": {"CallerID": "1234-test-user"}},
            "stage": "$default",
        },
    }

    response = handler(event, lambda_context)

    assert response["statusCode"] == 200, f"Failed to get me: {response}"
