import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # os.environ['POWERTOOLS_DEV'] = 1

from typing import Optional

from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.shared.types import Annotated
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError
)

from pydantic import BaseModel

from core.utils import Config, Session
from core.utils.auth import DiscordAdapter
from core.controllers import UserController, AuthController

os.environ['POWERTOOLS_SERVICE_NAME'] = 'auth'

app = APIGatewayHttpResolver(enable_validation=True)

# TODO: Make this a post
@app.get('/auth/authorize/discord')
def discord_authorize(
    test: Annotated[Optional[bool], Query()] = False
):
    print('User attempting to authorize via Discord')
    print('Returning redirect URI')
    
    
    return { "uri": DiscordAdapter(test=test).authorize_url }

class TokensetResponse(BaseModel):
    AccessToken: str
    RefreshToken: str
# TODO: Make this a post
@app.post('/auth/token/discord')
def discord_token(
    code: Annotated[str, Query()],
    test: Annotated[Optional[bool], Query()] = False
) -> TokensetResponse:
    Discord = DiscordAdapter(test=test)
    tokens = Discord.tokens(code)
    
    print(tokens)
    if 'error' in tokens:
        raise BadRequestError('Code is expired or invalid')
    
    discord_user = Discord.user(tokens['access_token'])
    
    try:
        user = UserController.get_user_by_id(discord_user.id)
        UserController.discord_post_auth_update_user(user, discord_user)
    except NotFoundError:
        UserController.discord_post_auth_create_user(discord_user)
                
    session = Session.generate_tokenset(claims={
        'sub': discord_user.id,
        'iss': discord_user.provider,
        },
        access_expiry_days=7
    )
    
    return session

@app.post('/auth/token/refresh')
def refresh_token(
    refresh_token: Annotated[str, Query()]
) -> TokensetResponse:
    claims = Session.validate_token(refresh_token)
    
    if not claims:
        raise BadRequestError('Invalid refresh token')
    
    return Session.generate_tokenset(claims)


def handler(event, context):
    return app.resolve(event, context)
