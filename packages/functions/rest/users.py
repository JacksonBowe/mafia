import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError
)

from core.tables import Users as UserTable
from core.controllers import UserController

app = APIGatewayHttpResolver(enable_validation=True)


@app.get('/users/me')
def get_me() -> UserTable.Entities.User:
    try:
        user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    except KeyError as e:
        raise BadRequestError(f"Missing CallerID")
    
    user = UserController.get_user_by_id(user_id)
    return user


@app.get('/users/<user_id>')
def get_user(user_id: str) -> UserTable.Entities.User:
    
    user = UserController.get_user_by_id(user_id)
    return user

def handler(event, context):
    return app.resolve(event, context)