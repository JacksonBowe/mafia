from botocore.exceptions import BotoCoreError
from aws_lambda_powertools.event_handler.exceptions import (
    NotFoundError,
    InternalServerError
)

from core.utils import Config, Dynamo
from core.utils.auth import DiscordUser

from core.tables import UsersTable


# def update_discord_user(user):
#     attributes={
#         'avatar': f"https://cdn.discordapp.com/avatars/{Config.get_secret('DISCORD_OAUTH_CLIENT_ID')}/{user['avatar']}",
#         'username': user['global_name'],
#         'provider': 'discord'
#     }
#     expr, names, vals = Dynamo.build_update_expression(attributes)
#     try:
#         user = get_user_by_id(user['id'])
#         update = UsersTable.table.update_item(
#             Key={
#                 'PK': user['id'],
#                 'SK': 'A'
#             },
#             UpdateExpression=expr,
#             ExpressionAttributeNames=names,
#             ExpressionAttributeValues=vals
#         )
#         return
#     except BotoCoreError as e:
#         raise InternalServerError(f"Error in DybnamoDB operation: {e}")
    

    

# TODO
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