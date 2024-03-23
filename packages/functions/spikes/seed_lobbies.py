import os
import random
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
from core.tables import UserTable, LobbyTable
from packages.functions.core.tables.Users._entities import User

from core.controllers import UserController, LobbyController

from core.utils import Dynamo
from core.utils.game import DEFAULT_GAME_CONFIG
    
def handler(event, context):
    users = UserController.get_users()
    seed_users = [user for user in users if user.provider == 'seed']
    
    lobbies = []
    for i in range(1, len(seed_users)):
        user = seed_users[i]
        
        if i < 4:
            lobby = LobbyController.create_lobby(
                name=f"Seed Lobby {i}",
                host=user,
                config=DEFAULT_GAME_CONFIG
            )
            lobbies.append(lobby)

            print('Seeded lobby', i)
        else:
            
            LobbyController.add_user_to_lobby(user, random.choice(lobbies))
        
    return event
 
