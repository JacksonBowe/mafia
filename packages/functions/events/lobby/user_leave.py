import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
 

from aws_lambda_powertools.utilities.data_classes import event_source, EventBridgeEvent

from core.controllers import LobbyController


@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    details = LobbyController.Events.UserLeave.Properties(**event.detail)

    
    # TODO: IoT Publish
    print(f'User {details.user_id} removed from lobby {details.lobby.id}')
    
    
    lobby_users = LobbyController.get_lobby_users(details.lobby.id)
    
    
    if not lobby_users:
        LobbyController.delete_lobby(details.lobby)
        print(f'Lobby {details.lobby.id} deleted')
    
    return 