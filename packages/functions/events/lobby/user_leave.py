import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
 

from aws_lambda_powertools.utilities.data_classes import event_source, EventBridgeEvent

from core.controllers import LobbyController

@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.UserLeave.Properties(**event.detail)
    
    print(f'User {details.user_id} removed from lobby {details.lobby.id}')
    
    # TODO: IoT Publish
    
    lobby_users = LobbyController.get_lobby_users(details.lobby.id)
    
    if not lobby_users:
        return LobbyController.delete_lobby(details.lobby)
    
    return 