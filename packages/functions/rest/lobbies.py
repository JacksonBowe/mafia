import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional, Union

from core.tables import LobbyTable
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    InternalServerError,
)
from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.shared.types import Annotated
from core.controllers import LobbyController, UserController
from core.utils.game import DEFAULT_GAME_CONFIG
from pydantic import BaseModel, Field

os.environ["POWERTOOLS_SERVICE_NAME"] = "lobby"

logger = Logger()
app = APIGatewayHttpResolver(enable_validation=True)


class CreateLobbyPayload(BaseModel):
    lobby_name: str = Field(alias="name")
    lobby_config: Optional[str] = Field(alias="config", default=DEFAULT_GAME_CONFIG)


@app.post("/lobbies")
def create_lobby(payload: CreateLobbyPayload) -> LobbyTable.Entities.Lobby:
    try:
        user_id = app.current_event.request_context.authorizer.get_lambda["CallerID"]
    except KeyError:
        raise BadRequestError("Missing CallerID")

    # Get the user
    user = UserController.get_user_by_id(user_id)

    # Verify that User is not already in a lobby
    if user.lobby:
        raise BadRequestError("User must leave current lobby before hosting")

    lobby = LobbyController.create_lobby(
        name=payload.lobby_name, host=user, config=payload.lobby_config
    )

    return lobby


@app.get("/lobbies")
def get_lobbies(
    users: Annotated[Optional[bool], Query()] = False,
):  # -> List[LobbyTable.Entities.Lobby] | List[LobbyController.LobbyWithUsers]
    lobbies = LobbyController.get_lobbies(with_users=users)
    return lobbies


@app.get("/lobbies/<lobby_id>")
def get_lobby(
    lobby_id: str, users: Annotated[Optional[bool], Query()] = False
) -> Union[
    LobbyController.LobbyWithUsers, LobbyTable.Entities.Lobby
]:  # TODO: This is doing wack shit
    lobby = LobbyController.get_lobby_by_id(lobby_id, with_users=users)
    return lobby


@app.post("/lobbies/<lobby_id>/join")
def join_lobby(lobby_id) -> None:
    user_id = app.current_event.request_context.authorizer.get_lambda["CallerID"]
    user = UserController.get_user_by_id(user_id)
    lobby = LobbyController.get_lobby_by_id(lobby_id)
    LobbyController.add_user_to_lobby(user, lobby)
    return


@app.post("/lobbies/leave")
def leave_lobby():
    # Verify User
    print(app.current_event.request_context.authorizer)
    user_id = app.current_event.request_context.authorizer.get_lambda["CallerID"]
    user = UserController.get_user_by_id(user_id)
    if not user.lobby:
        raise BadRequestError("User is not in a lobby")

    # Verify Lobby
    lobby = LobbyController.get_lobby_by_id(user.lobby)
    if not lobby:
        logger.error(
            "User record contains lobbyId for Lobby that does not exist. Attempting to fix"
        )
        # Attempt to fix
        UserController.clear_lobby(user)
        raise InternalServerError(
            "User record contains lobbyId for Lobby that does not exist. Attempting to fix"
        )

    LobbyController.remove_user_from_lobby(user, lobby)
    return


@app.post("/lobbies/<lobby_id>/terminate")
def terminate_lobby(lobby_id: str) -> None:
    lobby = LobbyController.get_lobby_by_id(lobby_id, with_users=True)
    for user in lobby.users:
        LobbyController.remove_user_from_lobby(
            UserController.get_user_by_id(user.id), lobby
        )


@app.post("/lobbies/terminate")
def terminate_all_lobbies() -> None:
    lobbies = LobbyController.get_lobbies(with_users=True)
    for lobby in lobbies:
        for user in lobby.users:
            LobbyController.remove_user_from_lobby(
                UserController.get_user_by_id(user.id), lobby
            )


def handler(event, context):
    return app.resolve(event, context)
