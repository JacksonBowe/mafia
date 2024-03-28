import os
from dataclasses import dataclass

import boto3
import pytest
from moto import mock_aws

# Provision mock infrastructure


@pytest.fixture(scope="session")
def environment():
    """Mocked Environment Variables for moto."""
    # AWS
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "ap-southeast-2"
    os.environ["AWS_REGION"] = "ap-southeast-2"

    # SST
    os.environ["SST_APP"] = "mafia-test"
    os.environ["SST_STAGE"] = "test"


@pytest.fixture(scope="function")
def aws(environment):
    with mock_aws():
        yield


@pytest.fixture(scope="function")
def secrets(aws):
    ssm = boto3.client("ssm")

    key, value = "DISCORD_OAUTH_CLIENT_ID", "12345"
    ssm.put_parameter(
        Name=f"/sst/{os.environ['SST_APP']}/{os.environ['SST_STAGE']}/Secret/{key}/value",
        Value=value,
        Type="SecureString",
        Overwrite=True,
    )

    yield


@pytest.fixture(scope="function")
def user_table(aws):
    # Set up the mock DynamoDB table
    dynamodb = boto3.resource("dynamodb", region_name="ap-southeast-2")
    table = dynamodb.create_table(
        TableName="UserTable",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )

    # Ensure the table is active
    table.meta.client.get_waiter("table_exists").wait(TableName="UserTable")

    # Set the environment variable
    os.environ["SST_TABLE_TABLENAME_USERTABLE"] = table.table_name

    # Seed the table

    return table


@pytest.fixture(scope="function")
def lobby_table(aws):
    # Set up the mock DynamoDB table
    dynamodb = boto3.resource("dynamodb", region_name="ap-southeast-2")
    table = dynamodb.create_table(
        TableName="LobbyTable",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "type", "AttributeType": "S"},
        ],
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        GlobalSecondaryIndexes=[
            {
                "IndexName": "itemsByType",  # Name your GSI
                "KeySchema": [
                    {
                        "AttributeName": "type",  # Attribute for the GSI
                        "KeyType": "HASH",
                    },
                ],
                "Projection": {
                    "ProjectionType": "ALL",  # Define what to project into the GSI
                },
                "ProvisionedThroughput": {
                    "ReadCapacityUnits": 5,
                    "WriteCapacityUnits": 5,
                },
            },
        ],
    )

    # Ensure the table is active
    table.meta.client.get_waiter("table_exists").wait(TableName="LobbyTable")

    # Set the environment variable
    os.environ["SST_TABLE_TABLENAME_LOBBYTABLE"] = table.table_name

    return table


@pytest.fixture(scope="function")
def event_bus(aws):
    client = boto3.client("events", region_name="ap-southeast-2")

    response = client.create_event_bus(Name="bus")

    # List event buses to verify that 'test-bus' was created
    response = client.list_event_buses()

    assert "bus" in str(response), "Event bus not created"

    os.environ["EVENT_BUS_NAME"] = "bus"


@pytest.fixture(scope="function")
def infra(user_table, lobby_table, event_bus):
    return


# @pytest.fixture(autouse=True)
# def seed_user_table(infra):
#     pass

# @pytest.fixture(autouse=True)
# def seed_lobby_table(infra):
#     pass


@pytest.fixture
def lambda_context():
    @dataclass
    class LambdaContext:
        function_name: str = "test"
        memory_limit_in_mb: int = 128
        invoked_function_arn: str = (
            "arn:aws:lambda:eu-west-1:123456789012:function:test"
        )
        aws_request_id: str = "da658bd3-2d6f-4e7b-8ec2-937234644fdc"

    return LambdaContext()
