import boto3
from boto3.dynamodb.table import TableResource
from boto3.resources.base import ServiceResource
from enum import Enum
from typing import Type

from core.tables.Session import SessionTable

ddb = boto3.resource('dynamodb')
# Baseclass for all DynamoDB tables
class Table:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._table = None
        
    class Indexes(Enum):
        pass
        
    @property
    def table(self) -> TableResource:
        if not self.table_name:
            raise ValueError("TABLE NOT BOUND")
        
        if not self._table:
            ddb = boto3.resource('dynamodb')
            self._table = ddb.Table(self.table_name)
            
        return self._table
    