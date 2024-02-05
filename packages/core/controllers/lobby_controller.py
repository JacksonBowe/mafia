import json

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
    
# def get_lobby_by_id    