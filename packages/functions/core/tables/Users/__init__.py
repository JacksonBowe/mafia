import os
import boto3
from botocore.exceptions import BotoCoreError
from aws_lambda_powertools.event_handler.exceptions import (
    NotFoundError,
    InternalServerError
)
import core.tables.Users.entities as entities
from core.utils import Dynamo

ddb = boto3.resource('dynamodb')
try:
    table_name = os.environ['SST_TABLE_TABLENAME_USERTABLE']
    table = ddb.Table(table_name)
except KeyError:
    print("UsersTable not bound")
    raise EnvironmentError("UsersTable not bound")

def update_item(pk, sk, attributes):
    try:
        table = ddb.Table(table_name)
        expr, names, vals = Dynamo.build_update_expression(attributes)
        update = table.update_item(
            Key={
                'PK': pk,
                'SK': sk
            },
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=vals
        )
        return update
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DynamoDB operation: {e}")
    
def get_item(pk, sk):
    try:
        table = ddb.Table(table_name)
        item = table.get_item(
            Key={
                'PK': pk,
                'SK': sk
            },
        ).get('Item')
        if not item: raise NotFoundError()
        return item
    except BotoCoreError as e:
        raise InternalServerError(f"Error in DynamoDB operation: {e}")