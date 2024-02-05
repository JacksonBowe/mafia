import os
os.environ['POWERTOOLS_SERVICE_NAME'] = "lobby"
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from typing import Optional

from pydantic import BaseModel, Field
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError
)
from core.utils import Events
from core.utils.game import DEFAULT_GAME_CONFIG
from core.tables import LobbyTable
from core.controllers import UserController, LobbyController

app = APIGatewayHttpResolver(enable_validation=True)

class CreateLobbyPayload(BaseModel):
    lobby_name: str = Field(alias='lobbyName')
    lobby_config: Optional[str] = Field(alias='lobbyConfig', default=DEFAULT_GAME_CONFIG)

@app.post('/lobbies')
def create_lobby(payload: CreateLobbyPayload) -> LobbyTable.entities.Lobby:
    try:
        user_id = app.current_event.request_context.authorizer.get_lambda['CallerID']
    except KeyError as e:
        raise BadRequestError(f"Missing CallerID")
    
    # Get the user
    user = UserController.get_user_by_id(user_id)
    
    # Verify that User is not already in a lobby
    if user.lobby: raise BadRequestError('User must leave current lobby before hosting')
    
    lobby = LobbyController.create_lobby(
        name=payload.lobby_name,
        host=user,
        config=payload.lobby_config
    )
    
    return lobby

def handler(event, context):
    return app.resolve(Events.SSTHTTPEvent(event), context)