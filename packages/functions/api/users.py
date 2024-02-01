import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
import requests
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver

from core.utils import Events
import core.tables.Users as UsersTable

app = APIGatewayHttpResolver(enable_validation=True)


@app.get('/users/me')
def get_me():
    user = UsersTable.get_item(pk='111786544246886400', sk='A')
    return user

def handler(event, context):
    print('here')
    return app.resolve(Events.SSTHTTPEvent(event), context)