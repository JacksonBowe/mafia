import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import requests
from jose import jwt
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver

from core.utils import Config, Session, Events
from core.controllers import UserController
from urllib.parse import urlencode

app = APIGatewayHttpResolver()

# TODO: Make this a post
@app.get('/auth/authorize/discord')
def discord_authorize():
    print('User attempting to authorize vis Discord')
    print('Returning redirect URI')
    
    discord_base_url = "https://discord.com/api/oauth2/authorize"
    params = {
        'client_id': Config.get_secret("DISCORD_OAUTH_CLIENT_ID"),
        'response_type': 'code',
        'redirect_uri': 'http://localhost:9000/auth/discord/callback',
        'scope': 'identify',
    }
    
    
    return { "uri": f"{discord_base_url}?{urlencode(params)}" }

# TODO: Make this a post
@app.get('/auth/token/discord')
def discord_token():
    code = app.current_event.get_query_string_value('code')
    params = {
        "client_id": Config.get_secret("DISCORD_OAUTH_CLIENT_ID"),
        "client_secret": Config.get_secret("DISCORD_OAUTH_CLIENT_SECRET"),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost:9000/auth/discord/callback"
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'application/x-www-form-urlencoded',
    }
    
    response = requests.post(
        'https://discord.com/api/oauth2/token', data=params, headers=headers
    )
    
    tokens = response.json()
    
    # Use the tokens to fetch the Discord user details
    user_response = requests.get('https://discord.com/api/users/@me', headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    
    discord_user = user_response.json()
    print(discord_user)
    
    UserController.update_discord_user(discord_user)
        
    session = Session.generate_tokenset(claims={
        'sub': discord_user['id'],
        'iss': 'discord',
        'username': discord_user['global_name'],
        'avatar': discord_user['avatar'],
        },
        expiry_days=7
    )
    
    return session


def handler(event, context):
    print('here')
    return app.resolve(Events.SSTHTTPEvent(event), context)
