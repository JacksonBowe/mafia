import os
from typing import Optional, Union

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    InternalServerError,
)
from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from core.controllers import LobbyController, UserController
from core.tables import LobbyTable
from core.utils.game import DEFAULT_GAME_CONFIG
from pydantic import BaseModel, Field
from typing_extensions import Annotated

os.environ["POWERTOOLS_SERVICE_NAME"] = "lobby"

logger = Logger()
router = APIGatewayHttpRouter()


class CreateLobbyPayload(BaseModel):
    lobby_name: str = Field(alias="name")
    lobby_config: Optional[str] = Field(alias="config", default=DEFAULT_GAME_CONFIG)


@router.post("/lobbies")
def create_lobby(payload: CreateLobbyPayload) -> LobbyTable.Entities.Lobby:
    try:
        user_id = router.context.get("caller_id")
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


@router.get("/lobbies")
def get_lobbies(
    users: Annotated[Optional[bool], Query()] = False,
):  # -> List[LobbyTable.Entities.Lobby] | List[LobbyController.LobbyWithUsers]
    lobbies = LobbyController.get_lobbies(with_users=users)
    return lobbies


@router.get("/lobbies/<lobby_id>")
def get_lobby(
    lobby_id: str, users: Annotated[Optional[bool], Query()] = False
) -> Union[
    LobbyController.LobbyWithUsers, LobbyTable.Entities.Lobby
]:  # TODO: This is doing wack shit
    lobby = LobbyController.get_lobby_by_id(lobby_id, with_users=users)
    return lobby


@router.post("/lobbies/<lobby_id>/join")
def join_lobby(lobby_id) -> None:
    user_id = router.context.get("caller_id")
    user = UserController.get_user_by_id(user_id)
    lobby = LobbyController.get_lobby_by_id(lobby_id)
    LobbyController.add_user_to_lobby(user, lobby)
    return


@router.post("/lobbies/leave")
def leave_lobby():
    # Verify User
    user_id = router.context.get("caller_id")
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


@router.post("/lobbies/<lobby_id>/terminate")
def terminate_lobby(lobby_id: str) -> None:
    lobby = LobbyController.get_lobby_by_id(lobby_id, with_users=True)
    for user in lobby.users:
        LobbyController.remove_user_from_lobby(
            UserController.get_user_by_id(user.id), lobby
        )


@router.post("/lobbies/terminate")
def terminate_all_lobbies() -> None:
    lobbies = LobbyController.get_lobbies(with_users=True)
    for lobby in lobbies:
        for user in lobby.users:
            LobbyController.remove_user_from_lobby(
                UserController.get_user_by_id(user.id), lobby
            )


@router.post("/lobbies/start")
def start_lobby():
    caller_id = router.context.get("caller_id")
    user = UserController.get_user_by_id(caller_id)

    # Get the lobby
    lobby = LobbyController.get_lobby_by_id(user.lobby, with_users=True)

    # Validate
    if not lobby.host:
        raise InternalServerError(f"Lobby {lobby.id} has no host")
    if not lobby.users:
        raise InternalServerError(f"Lobby {lobby.id} has no users")
    if lobby.host.id != user.id:
        raise BadRequestError("Only the host can start the game")

    LobbyController.start_lobby(lobby)
