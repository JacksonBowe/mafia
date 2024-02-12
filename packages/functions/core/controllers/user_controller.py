from botocore.exceptions import BotoCoreError
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.parser import ValidationError
from aws_lambda_powertools.event_handler.exceptions import (
    NotFoundError,
    InternalServerError
)

from core.utils import Config, Dynamo
from core.utils.auth import DiscordUser

from core.tables import Users as UsersTable

logger = Logger()
 

def get_user_by_id(id: str) -> UsersTable.entities.User:
    try:
        item = UsersTable.table.get_item(
            Key={
                'PK': id,
                'SK': 'A'
            }
        ).get('Item')
        if not item: raise NotFoundError(f"No user found with id '{id}'")
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DybnamoDB operation: {e}")
    
    return UsersTable.entities.User.deserialize(item)

def clear_lobby(user: UsersTable.entities.User):
    try:
        user.update({
            'lobby': None
        })
    except ValidationError as e:
        logger.exception(e)
        raise InternalServerError(f"Error updating user. {str(e)}") from e
    
    try:
        expr, names, vals = Dynamo.build_update_expression(user._updated_attributes)
        UsersTable.table.update_item(
            Key={
                'PK': user.id,
                'SK': 'A'
            },
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=vals,
        )
    except ValidationError as e:
        logger.exception(e)
        raise InternalServerError(f"Error updating user. {str(e)}") from e
    