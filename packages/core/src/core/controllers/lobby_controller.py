import json
from typing import List

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError,
    NotFoundError,
)
from botocore.exceptions import BotoCoreError, ClientError
from core.events import Event
from core.realtime import RealtimeEvent, publish_iot
from core.tables import LobbyTable, UserTable
import core.utils.dynamo as Dynamo
from pydantic import BaseModel, ValidationError

ddb_client = boto3.client("dynamodb")
logger = Logger()


class LobbyWithUsers(LobbyTable.Entities.Lobby):
    users: List[LobbyTable.Entities.LobbyUser] = None

    @classmethod
    def from_lobby(
        cls,
        lobby: LobbyTable.Entities.Lobby,
        users: List[LobbyTable.Entities.LobbyUser],
    ):
        return cls(**{**lobby.model_dump(), "users": users})


class Events:
    class UserJoin(Event):
        event_name = "lobby.user_join"

        class Properties(BaseModel):
            user: LobbyTable.Entities.LobbyUser
            lobby: LobbyTable.Entities.Lobby

    class UserLeave(Event):
        event_name = "lobby.user_leave"

        class Properties(BaseModel):
            user: LobbyTable.Entities.LobbyUser
            lobby: LobbyTable.Entities.Lobby

    class LobbyStart(Event):
        event_name = "lobby.start"

        class Properties(BaseModel):
            lobby: LobbyWithUsers


def create_lobby(
    name, host: UserTable.Entities.User, config: dict
) -> LobbyTable.Entities.Lobby:
    # Need to create a new lobby records, and update the User.host value

    # Create Lobby instance
    lobby = LobbyTable.Entities.Lobby(
        id=Dynamo.new_id(),
        createdAt=Dynamo.timestamp(),
        host=LobbyTable.Entities.Lobby.LobbyHost(id=host.id, username=host.username),
        config=json.dumps(config),
        name=name,
    )

    # Create LobbyUser instance from host
    lobby_user = LobbyTable.Entities.LobbyUser(
        id=host.id,
        createdAt=Dynamo.timestamp(),
        username=host.username,
        lobbyId=lobby.id,
    )

    # Update the host with the new lobby id
    try:
        op = host.update({"lobby": lobby.id})
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e

    try:
        # Transaction to put lobby and update user
        ddb_client.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "Item": Dynamo.serialize(lobby.serialize()),
                        "TableName": LobbyTable.table_name,
                    },
                },
                {
                    "Put": {
                        "Item": Dynamo.serialize(lobby_user.serialize()),
                        "TableName": LobbyTable.table_name,
                    },
                },
                {
                    "Update": {
                        "Key": Dynamo.serialize({"PK": host.PK, "SK": host.SK}),
                        "UpdateExpression": op.expression,
                        "ExpressionAttributeNames": op.names,
                        "ExpressionAttributeValues": Dynamo.serialize(op.values),
                        "TableName": UserTable.table_name,
                    }
                },
            ]
        )
    except ddb_client.exceptions.TransactionCanceledException as e:
        logger.exception(
            f"Host lobby failed transaction. {e.response['CancellationReasons']}"
        )
        raise InternalServerError(
            f"Host lobby failed transaction. {e.response['CancellationReasons']}"
        )

    return lobby


def get_lobby_by_id(
    lobby_id: str, with_users: bool = False
) -> LobbyTable.Entities.Lobby | LobbyWithUsers:
    try:
        item = LobbyTable.table.get_item(Key={"PK": lobby_id, "SK": "A"}).get("Item")
    except BotoCoreError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    if not item:
        raise NotFoundError(f"No lobby with id '{lobby_id}'")

    try:
        lobby = LobbyTable.Entities.Lobby.deserialize(item)
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))

    if with_users:
        return LobbyWithUsers.from_lobby(lobby, get_lobby_users(lobby.id))

    return lobby


def get_lobbies(
    with_users: bool = False,
) -> List[LobbyTable.Entities.Lobby] | List[LobbyWithUsers]:
    try:
        items = LobbyTable.table.query(
            IndexName=LobbyTable.Indexes.ITEMS_BY_TYPE.value,
            KeyConditionExpression="#t=:t",
            ExpressionAttributeNames={"#t": "type"},
            ExpressionAttributeValues={":t": LobbyTable.EntityType.LOBBY.value},
        ).get("Items", [])
    except BotoCoreError as e:
        logger.error(str(e))
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    try:
        lobbies = [LobbyTable.Entities.Lobby.deserialize(item) for item in items]
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))

    if with_users:
        return [
            LobbyWithUsers.from_lobby(lobby, get_lobby_users(lobby.id))
            for lobby in lobbies
        ]

    return lobbies


def get_lobby_users(lobby_id: str) -> List[LobbyTable.Entities.LobbyUser]:
    try:
        items = LobbyTable.table.query(
            KeyConditionExpression="#pk=:pk and begins_with(#sk, :sk)",
            ExpressionAttributeNames={"#pk": "PK", "#sk": "SK"},
            ExpressionAttributeValues={":pk": lobby_id, ":sk": "LU"},
        ).get("Items", [])
    except BotoCoreError as e:
        logger.error(str(e))
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    try:
        lobby_users = [
            LobbyTable.Entities.LobbyUser.deserialize(item) for item in items
        ]
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))

    return lobby_users


def get_lobby_user(lobby_id: str, user_id: str) -> LobbyTable.Entities.LobbyUser:
    try:
        item = LobbyTable.table.get_item(
            Key={"PK": lobby_id, "SK": f"LU#{user_id}"}
        ).get("Item")
    except BotoCoreError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    if not item:
        raise NotFoundError(f"No lobby user with id '{user_id}' in lobby '{lobby_id}'")

    try:
        lobby_user = LobbyTable.Entities.LobbyUser.deserialize(item)
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))

    return lobby_user


def delete_lobby(lobby: LobbyTable.Entities.Lobby):
    try:
        LobbyTable.table.delete_item(Key={"PK": lobby.PK, "SK": lobby.SK})
    except ClientError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")


# def grant_host(lobby: Lobby, user: LobbyUser) -> None:
#     pass


def add_user_to_lobby(
    user: UserTable.Entities.User, lobby: LobbyTable.Entities.Lobby
) -> None:
    try:
        op = user.update({"lobby": lobby.id})
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e

    lobby_user = LobbyTable.Entities.LobbyUser(
        id=user.id,
        createdAt=Dynamo.timestamp(),
        username=user.username,
        lobbyId=lobby.id,
    )

    try:
        # Transaction to delete LobbyUser and update User
        ddb_client.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "Item": Dynamo.serialize(lobby_user.serialize()),
                        "TableName": LobbyTable.table_name,
                    },
                },
                {
                    "Update": {
                        "Key": Dynamo.serialize({"PK": user.PK, "SK": user.SK}),
                        "UpdateExpression": op.expression,
                        "ExpressionAttributeNames": op.names,
                        "ExpressionAttributeValues": Dynamo.serialize(op.values),
                        "TableName": UserTable.table_name,
                    }
                },
            ]
        )
    except ddb_client.exceptions.TransactionCanceledException as e:
        logger.exception(
            f"Leave lobby failed transaction. {e.response['CancellationReasons']}"
        )
        raise InternalServerError(
            f"Leave lobby failed transaction. {e.response['CancellationReasons']}"
        )
    except ClientError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    # Raise user join event
    Events.UserJoin.publish({"user": lobby_user, "lobby": lobby})

    return lobby


def remove_user_from_lobby(
    user: UserTable.Entities.User, lobby: LobbyTable.Entities.Lobby
):
    try:
        op = user.update({"lobby": None})
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e

    lobby_user = get_lobby_user(lobby.id, user.id)

    try:
        # Transaction to delete LobbyUser and update User
        ddb_client.transact_write_items(
            TransactItems=[
                {
                    "Delete": {
                        "Key": Dynamo.serialize(
                            {"PK": lobby_user.PK, "SK": lobby_user.SK}
                        ),
                        "TableName": LobbyTable.table_name,
                    },
                },
                {
                    "Update": {
                        "Key": Dynamo.serialize({"PK": user.PK, "SK": user.SK}),
                        "UpdateExpression": op.expression,
                        "ExpressionAttributeNames": op.names,
                        "TableName": UserTable.table_name,
                    }
                },
            ]
        )
    except ddb_client.exceptions.TransactionCanceledException as e:
        logger.exception(
            f"Leave lobby failed transaction. {e.response['CancellationReasons']}"
        )

        raise InternalServerError(
            f"Leave lobby failed transaction. {e.response['CancellationReasons']}"
        )
    except ClientError as e:
        logger.error(f"Error in DynamoDB operation: {e}. Operation {op}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}. Operation {op}")

    # Raise user leave event
    Events.UserLeave.publish({"user": lobby_user, "lobby": lobby})
    return lobby


def promote_lobby_user_to_host(
    lobby_user: LobbyTable.Entities.LobbyUser, lobby: LobbyTable.Entities.Lobby
):
    if not lobby_user.lobbyId:
        raise InternalServerError(f"User {lobby_user.id} is not in a lobby")

    if not lobby_user.lobbyId == lobby.id:
        raise InternalServerError(f"User {lobby_user.id} is not in lobby {lobby.id}")

    # Update the Lobby
    try:
        operation = lobby.update(
            {
                "host": LobbyTable.Entities.Lobby.LobbyHost(
                    id=lobby_user.id, username=lobby_user.username
                )
            }
        )

        LobbyTable.table.update_item(
            Key={"PK": lobby.PK, "SK": lobby.SK},
            UpdateExpression=operation.expression,
            ExpressionAttributeNames=operation.names,
            ExpressionAttributeValues=operation.values,
        )

    except ValidationError as e:
        terminate_lobby(lobby)
        raise InternalServerError(f"Error updating lobby. {str(e)}") from e
    except ValueError as e:
        terminate_lobby(lobby)
        raise InternalServerError(f"Error updating lobby. {str(e)}") from e
    except ClientError as e:
        terminate_lobby(lobby)
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    # Publish a new host event
    publish_iot(lobby.id, RealtimeEvent.LOBBY_NEW_HOST, lobby_user.serialize())

    return lobby


def terminate_lobby(lobby: LobbyTable.Entities.Lobby):
    # Remove all users from the lobby
    lobby_users = get_lobby_users(lobby.id)
    for user in lobby_users:
        remove_user_from_lobby(user, lobby)

    return


def start_lobby(lobby: LobbyWithUsers) -> None:
    # Publish EventBus Event
    Events.LobbyStart.publish({"lobby": lobby})
