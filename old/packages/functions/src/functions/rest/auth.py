import os
from typing import Optional
from typing_extensions import Annotated

from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError,
)
from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.utilities.parser import BaseModel

from core.controllers import AuthController, UserController
from core.utils.auth import DiscordAdapter

os.environ["POWERTOOLS_SERVICE_NAME"] = "auth"
router = APIGatewayHttpRouter()


# TODO: Make this a post?
@router.get("/auth/authorize/discord")
def discord_authorize(test: Annotated[Optional[bool], Query()] = False):
    print("User attempting to authorize via Discord")
    print("Returning redirect URI")

    return {"uri": DiscordAdapter(test=test).authorize_url}


class TokensetResponse(BaseModel):
    AccessToken: str
    RefreshToken: str


@router.post("/auth/token/discord")
def discord_token(
    code: Annotated[str, Query()], test: Annotated[Optional[bool], Query()] = False
) -> TokensetResponse:
    Discord = DiscordAdapter(test=test)
    tokens = Discord.tokens(code)

    if "error" in tokens:
        raise BadRequestError("Code is expired or invalid")

    discord_user = Discord.user(tokens["access_token"])
    try:
        user = UserController.get_user_by_id(discord_user.id)
        UserController.discord_post_auth_update_user(user, discord_user)
    except NotFoundError:
        UserController.discord_post_auth_create_user(discord_user)

    session = AuthController.generate_tokenset(
        claims={
            "sub": discord_user.id,
            "iss": discord_user.provider,
        },
        access_expiry_days=7,
    )

    return session


@router.post("/auth/token/refresh")
def refresh_token(refresh_token: Annotated[str, Query()]) -> TokensetResponse:
    claims = AuthController.validate_token(refresh_token, "refreshToken")

    if not claims:
        raise BadRequestError("Invalid refresh token")

    return AuthController.generate_tokenset(claims)
