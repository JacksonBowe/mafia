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

ddb_client = boto3.client('dynamodb')
logger = Logger()
def create_lobby(name, host: UsersTable.entities.User, config: dict) -> LobbyTable.entities.Lobby:
    # Need to create a new lobby records, and update the User.host value
    
    # Create Lobby instance
    lobby = LobbyTable.entities.Lobby(
        id=Dynamo.new_id(),
        createdAt=Dynamo.timestamp(),
        host=LobbyTable.entities.Lobby.LobbyHost(
            id=host.id,
            username=host.username
        ),
        config=json.dumps(config),
        name=name
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
    
def get_lobby_by_id(lobby_id: str) -> LobbyTable.entities.Lobby:
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
    
    try:
        lobby = LobbyTable.entities.Lobby.deserialize(item)
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))
    
    return lobby

def get_lobbies() -> List[LobbyTable.entities.Lobby]:
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
        lobbies = [LobbyTable.entities.Lobby.deserialize(item) for item in items]
    except ValidationError as e:
        logger.error(str(e))
        raise InternalServerError(str(e))
    
    return lobbies

