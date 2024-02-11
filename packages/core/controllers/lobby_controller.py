import os
import json
from typing import List

from botocore.exceptions import BotoCoreError, ClientError
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    NotFoundError,
    InternalServerError
)
import boto3
from pydantic import ValidationError

from core.utils import Dynamo
from core.tables import UsersTable, LobbyTable
from core.tables.Users.entities import User
from core.tables.Lobby.entities import Lobby, LobbyUser

from core.events import Event
from pydantic import BaseModel

ddb_client = boto3.client('dynamodb')
logger = Logger()

class LobbyWithUsers(Lobby):
    users: List[LobbyUser] = None
    
    @classmethod
    def from_lobby(cls, lobby: Lobby, users: List[Lobby]):
        return cls(**{**lobby.model_dump(), 'users': users }) 
   
   
class Events:
    class UserLeave(Event):
        event_name = 'lobby.user_leave'
        class Properties(BaseModel):
            user_id: str
            lobby: Lobby

 

def create_lobby(name, host: User, config: dict) -> Lobby:
    # Need to create a new lobby records, and update the User.host value
    
    # Create Lobby instance
    lobby = Lobby(
        id=Dynamo.new_id(),
        createdAt=Dynamo.timestamp(),
        host=Lobby.LobbyHost(
            id=host.id,
            username=host.username
        ),
        config=json.dumps(config),
        name=name
    )
    
    # Create LobbyUser instance from host
    lobby_user = LobbyUser(
        id=host.id,
        createdAt=Dynamo.timestamp(),
        username=host.username,
        lobbyId=lobby.id
    )
    
    # Update the host with the new lobby id
    try:
        host.update({ 'lobby': lobby.id })
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e
    
    host_expr, host_names, host_vals = Dynamo.build_update_expression(host._updated_attributes)

    try:
        # Transaction to put lobby and update user
        transaction = ddb_client.transact_write_items(
            TransactItems=[
                {
                    'Put': {
                        'Item': Dynamo.serialize(lobby.serialize()),
                        'TableName': LobbyTable.table_name
                    },
                },{
                    'Put': {
                        'Item': Dynamo.serialize(lobby_user.serialize()),
                        'TableName': LobbyTable.table_name
                    },
                },{
                    'Update': {
                        'Key': Dynamo.serialize({
                            'PK': host.PK,
                            'SK': host.SK
                        }),
                        'UpdateExpression': host_expr,
                        'ExpressionAttributeNames': host_names,
                        'ExpressionAttributeValues': Dynamo.serialize(host_vals),
                        'TableName': UsersTable.table_name
                    }
                }
            ]
        )
    except ddb_client.exceptions.TransactionCanceledException as e:
        logger.exception(f"Host lobby failed transaction. {e.response['CancellationReasons']}")
        raise InternalServerError(f"Host lobby failed transaction. {e.response['CancellationReasons']}")
    
    return lobby
    
def get_lobby_by_id(lobby_id: str, with_users: bool=False) -> Lobby | LobbyWithUsers:
    try:
        item = LobbyTable.table.get_item(
            Key={
                'PK': lobby_id,
                'SK': 'A'
            }
        ).get('Item')
    except BotoCoreError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")
    
    if not item: raise NotFoundError(f"No lobby with id '{lobby_id}'")
    
    try:
        lobby = Lobby.deserialize(item)
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))
    
    if with_users:
        return LobbyWithUsers.from_lobby(lobby, get_lobby_users(lobby.id))
    
    return lobby

def get_lobbies(with_users: bool=False) -> List[Lobby]:
    try:
        items = LobbyTable.table.query(
            IndexName=LobbyTable.Indexes.ITEMS_BY_TYPE.value,
            KeyConditionExpression='#t=:t',
            ExpressionAttributeNames={ '#t': 'type' },
            ExpressionAttributeValues={ ':t': LobbyTable.entities.EntityType.LOBBY.value }
        ).get('Items', [])
    except BotoCoreError as e:
        logger.error(str(e))
        raise InternalServerError(f"Error in DynamoDB operation: {e}")
    
    try:
        lobbies = [Lobby.deserialize(item) for item in items]
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))
    
    if with_users:
        return [LobbyWithUsers.from_lobby(lobby, get_lobby_users(lobby.id)) for lobby in lobbies]
    
    return lobbies

def get_lobby_users(lobby_id: str) -> List[LobbyUser]:
    try:
        items = LobbyTable.table.query(
            KeyConditionExpression='#pk=:pk and begins_with(#sk, :sk)',
            ExpressionAttributeNames={ '#pk': 'PK', '#sk': 'SK' },
            ExpressionAttributeValues={ ':pk': lobby_id, ':sk': 'LU' }
        ).get('Items', [])
    except BotoCoreError as e:
        logger.error(str(e))
        raise InternalServerError(f"Error in DynamoDB operation: {e}")
    
    try:
        lobby_users = [LobbyUser.deserialize(item) for item in items]
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))
    
    return lobby_users

def get_lobby_user(lobby_id: str, user_id: str) -> LobbyUser:
    try:
        item = LobbyTable.table.get_item(
            Key={
                'PK': lobby_id,
                'SK': f"LU{user_id}"
            }
        ).get('Item')
    except BotoCoreError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")

    if not item: raise NotFoundError(f"No lobby user with id '{user_id}' in lobby '{lobby_id}'")

    try:
        lobby_user = LobbyUser.deserialize(item)
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))

    return lobby_user

def delete_lobby(lobby: Lobby):
    try:
        LobbyTable.table.delete_item(
            Key={
                'PK': lobby.PK,
                'SK': lobby.SK
            }
        )
    except ClientError as e:
        logger.error(f"Error in DynamoDB operation: {e}")
        raise InternalServerError(f"Error in DynamoDB operation: {e}")
    
# def grant_host(lobby: Lobby, user: LobbyUser) -> None:
#     pass

def remove_user_from_lobby(user: User, lobby: Lobby):
    try:
        user.update({ 'lobby': None })
    except ValidationError as e:
        raise InternalServerError(f"Error updating user. {str(e)}") from e
    
    lobby_user = get_lobby_user(lobby.id, user.id)
    
    
    # Update the User
    expr, names, vals = Dynamo.build_update_expression(user._updated_attributes)

    try:
        # Transaction to delete LobbyUser and update User
        transaction = ddb_client.transact_write_items(
            TransactItems=[
                {
                    'Delete': {
                        'Key': Dynamo.serialize({
                            'PK': lobby_user.PK,
                            'SK': lobby_user.SK
                        }),
                        'TableName': LobbyTable.table_name
                    },
                },{
                    'Update': {
                        'Key': Dynamo.serialize({
                            'PK': user.PK,
                            'SK': user.SK
                        }),
                        'UpdateExpression': expr,
                        'ExpressionAttributeNames': names,
                        'ExpressionAttributeValues': Dynamo.serialize(vals),
                        'TableName': UsersTable.table_name
                    }
                }
            ]
        )
    except ddb_client.exceptions.TransactionCanceledException as e:
        logger.exception(f"Leave lobby failed transaction. {e.response['CancellationReasons']}")
        raise InternalServerError(f"Leave lobby failed transaction. {e.response['CancellationReasons']}")
    
    # Raise user leave event
    Events.UserLeave.publish({
        'user_id': user.id,
        'lobby': lobby
    })
    
    return lobby

