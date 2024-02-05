import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
import requests
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError
)
from core.utils import Events
import core.tables.Users as UsersTable
from core.controllers import UserController

app = APIGatewayHttpResolver(enable_validation=True)


@app.get('/users/me')
def get_me():
    try:
        user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    except KeyError as e:
        raise BadRequestError(f"Missing CallerID")
    
    
    user = UserController.get_user_by_id(user_id)
    return user

def handler(event, context):
    print('here')
    return app.resolve(Events.SSTHTTPEvent(event), context)