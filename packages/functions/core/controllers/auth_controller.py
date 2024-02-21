from botocore.exceptions import BotoCoreError
from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError
)
from pydantic import ValidationError

from core.utils import Dynamo
from core.utils.auth import DiscordUser
from core.tables import Users as UsersTable

# def discord_post_auth_create(discord_user: DiscordUser):
#     # TODO
#     user = UsersTable.entities.User(
#         id=discord_user.id,
#         createdAt=Dynamo.timestamp(),
#         username=discord_user.username,
#         provider=discord_user.provider,
#         avatar=discord_user.avatar,
#         lastLogin=Dynamo.timestamp()
#     )
    
#     try:
#         create = UsersTable.table.put_item(
#             Item=user.serialize()
#         )
#     except BotoCoreError as e:
#         raise InternalServerError(f"Error in DybnamoDB operation: {e}")

# def discord_post_auth_update(user: UsersTable.entities.User, discord_user: DiscordUser):
#     # TODO
    
#     attrs = {
#         'avatar': discord_user.avatar,
#         'username': discord_user.username,
#         'lastLogin': Dynamo.timestamp(),
#     }
#     try:
#         user.update(attrs)
#     except ValidationError as e:
#         raise InternalServerError(f"Error updating user. {str(e)}") from e

#     expr, names, vals = Dynamo.build_update_expression(user._updated_attributes)

#     try:
#         update = UsersTable.table.update_item(
#             Key={
#                 'PK': discord_user.id,
#                 'SK': 'A'
#             },
#             UpdateExpression=expr,
#             ExpressionAttributeNames=names,
#             ExpressionAttributeValues=vals
#         )
#         return
#     except BotoCoreError as e:
#         raise InternalServerError(f"Error in DybnamoDB operation: {e}")