# import os
# if os.getenv('IS_LOCAL'):
#     import sys
#     sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
# from core.tables import UsersTable, LobbyTable
# from packages.functions.core.tables.Users._entities import User

# from core.controllers import LobbyController

# from core.utils import Dynamo
    
# def handler(event, context):
#     host = User(
#         id=Dynamo.new_id(),
#         createdAt=Dynamo.timestamp(),
#         username='SeedUser_1',
#         provider="seed_lobbies"
#     )
#     return event
 
