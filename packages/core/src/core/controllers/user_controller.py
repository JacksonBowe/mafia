import core.utils.dynamo as Dynamo
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError,
    NotFoundError,
)
from aws_lambda_powertools.utilities.parser import ValidationError
from botocore.exceptions import BotoCoreError
from core.tables import UserTable
from core.utils.auth import DiscordUser

logger = Logger()


def discord_post_auth_create_user(discord_user: DiscordUser):
    # TODO
    user = UserTable.Entities.User(
        id=discord_user.id,
        createdAt=Dynamo.timestamp(),
        username=discord_user.username,
        provider=discord_user.provider,
        avatar=discord_user.avatar,
        lastLogin=Dynamo.timestamp(),
    )

    try:
        create = UserTable.table.put_item(Item=user.serialize())
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DybnamoDB operation: {e}")

    return create


def discord_post_auth_update_user(
    user: UserTable.Entities.User, discord_user: DiscordUser
):
    # TODO

    attrs = {
        "avatar": discord_user.avatar,
        "username": discord_user.username,
        "lastLogin": Dynamo.timestamp(),
    }
    try:
        op = user.update(attrs)
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e

    try:
        update = UserTable.table.update_item(
            Key={"PK": discord_user.id, "SK": "A"},
            UpdateExpression=op.expression,
            ExpressionAttributeNames=op.names,
            ExpressionAttributeValues=op.values,
        )
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DybnamoDB operation: {e}")

    return update


def get_users() -> list[UserTable.Entities.User]:
    try:
        items = UserTable.table.scan().get("Items")
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DybnamoDB operation: {e}")

    return [UserTable.Entities.User.deserialize(item) for item in items]


def get_user_by_id(id: str) -> UserTable.Entities.User:
    try:
        item = UserTable.table.get_item(Key={"PK": id, "SK": "A"}).get("Item")
        if not item:
            raise NotFoundError(f"No user found with id '{id}'")
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DybnamoDB operation: {e}")

    return UserTable.Entities.User.deserialize(item)


def clear_lobby(user: UserTable.Entities.User):
    try:
        op = user.update({"lobby": None})
    except ValidationError as e:
        logger.exception(e)
        raise InternalServerError(f"Error updating user. {str(e)}") from e

    try:
        # op = Dynamo.build_update_expression(user._updated_attributes)
        UserTable.table.update_item(
            Key={"PK": user.id, "SK": "A"},
            UpdateExpression=op.expression,
            ExpressionAttributeNames=op.names,
            ExpressionAttributeValues=op.values,
        )
    except ValidationError as e:
        logger.exception(e)
        raise InternalServerError(f"Error updating user. {str(e)}") from e
