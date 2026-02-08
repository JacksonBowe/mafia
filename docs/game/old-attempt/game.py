import json
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    ServiceError
)

from core.utils.api import SSTEvent

from core.controllers import GameController, UserController

import random

def iterator(event, context):
    print(event)

    return {
        "waitSeconds": 3,
        "continue": random.choice([True, True, True, True, False])
    }

# Step Functions
def changeStage(event: dict, context):
    return GameController().change_stage(game_id=event['gameId'], poll_count=event.get('pollCount', 0))

def townHall(event, context):
    return GameController().town_hall(game_id=event['gameId'], iteration=event['count'])
    # print('Town Hall')
    # print(event)
    # new_count = event['count'] + 1
    # GameController()._tally_votes('bcc2f46c-8d42-450c-b71c-170c8c13d261')
    # return {
    #     "waitSeconds": 3,
    #     "count": new_count,
    #     "continue": new_count < 1,
    #     "gameId": event['gameId']
    # }

# API

app = APIGatewayHttpResolver()
logger = Logger()

@app.get("/game")
def get_game():
    user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    user = UserController()._get_user(user_id)
    return GameController().get_game(user.game)

@app.get("/game/actor")
def get_caller():
    user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    user = UserController()._get_user(user_id)
    return GameController().get_actor(user.game, user_id)

@app.post("/game/vote")
def vote():
    user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    user = UserController()._get_user(user_id)

    target_id = app.current_event.json_body.get('target', None)

    return GameController().vote(user.game, user_id, target_id)

@app.post("/game/verdict")
def verdict():
    user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    user = UserController()._get_user(user_id)

    verdict = app.current_event.json_body.get('verdict', None)

    return GameController().verdict(user.game, user_id, verdict)

@app.post("/game/targets")
def targets():
    user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    user = UserController()._get_user(user_id)

    targets = app.current_event.json_body.get('targets', None)

    return GameController().targets(user.game, user_id, targets)

@app.post("/game/test")
def test():
    GameController()._start_primary_state_machine('682bea60-4a05-48c8-94dc-24a2f0aeebd8', 10)

    # GameController()._tally_votes('bcc2f46c-8d42-450c-b71c-170c8c13d261')
    # import os
    # import boto3

    # client = boto3.client('stepfunctions')
    # client.start_execution(
    #     stateMachineArn=os.environ['TOWN_HALL_MACHINE_ARN'],
    #     input=json.dumps({'waitSeconds': 3, 'gameId': 'bcc2f46c-8d42-450c-b71c-170c8c13d261'})
    # )

def handler(event, context):
    return app.resolve(SSTEvent(event), context)