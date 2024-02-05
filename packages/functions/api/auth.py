import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from typing import Optional

from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.shared.types import Annotated
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    NotFoundError
)

from pydantic import BaseModel

from core.utils import Config, Session, Events
from core.utils.auth import DiscordAdapter
from core.controllers import UserController, AuthController

app = APIGatewayHttpResolver(enable_validation=True)

# TODO: Make this a post
@app.get('/auth/authorize/discord')
def discord_authorize(
    test: Annotated[Optional[bool], Query()] = False
):
    print('User attempting to authorize vis Discord')
    print('Returning redirect URI')
    
    
    return { "uri": DiscordAdapter(test=test).authorize_url }

class DiscordTokenResponse(BaseModel):
    AccessToken: str
# TODO: Make this a post
@app.post('/auth/token/discord')
def discord_token(
    code: Annotated[str, Query()],
    test: Annotated[Optional[bool], Query()] = False
) -> DiscordTokenResponse:
    Discord = DiscordAdapter(test=test)
    tokens = Discord.tokens(code)
    print(tokens)
    discord_user = Discord.user(tokens['access_token'])
    
    try:
        user = UserController.get_user_by_id(discord_user.id)
        AuthController.discord_post_auth_update(user, discord_user)
    except NotFoundError:
        AuthController.discord_post_auth_create(discord_user)
                
    session = Session.generate_tokenset(claims={
        'sub': discord_user.id,
        'iss': discord_user.provider,
        },
        expiry_days=7
    )
    
    return session


def handler(event, context):
    return app.resolve(Events.SSTHTTPEvent(event), context)
