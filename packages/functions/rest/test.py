import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import requests
from jose import jwt
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver

from core.utils import Config

app = APIGatewayHttpResolver()

@app.get('/manual/discord/authorize')
def auth_discord():
    print(Config.get_secret("DISCORD_OAUTH_CLIENT_ID"))
    # return { "uri": "https://discord.com/api/oauth2/authorize?client_id=1199832847012352052&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2F&scope=identify"}
    return { "uri": "https://discord.com/api/oauth2/authorize?client_id=1199832847012352052&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fauth%2Fdiscord%2Fcallback&scope=identify"}

@app.get('/manual/discord/token')
def auth_discord_token():
    code = app.current_event.get_query_string_value('code')
    print(code)
    params = {
        "client_id": Config.get_secret("DISCORD_OAUTH_CLIENT_ID"),
        "client_secret": Config.get_secret("DISCORD_OAUTH_CLIENT_SECRET"),
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost:9000/"
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'application/x-www-form-urlencoded',
    }
    
    response = requests.post(
        'https://discord.com/api/oauth2/token', data=params, headers=headers
    )
    
    
    tokens = response.json()
    print(tokens)
    
    user_response = requests.get('https://discord.com/api/users/@me', headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    
    
    encoded = jwt.encode(tokens, 'secret', algorithm='HS256')
    # decoded_fail = jwt.decode(encoded, 'wrongsecret', algorithms=['HS256'])
    # decoded = jwt.decode(encoded, 'secret', algorithms=['HS256'])
    
    # print({"Encoded": encoded})
    # print("Decoded Fail", decoded_fail)
    # print("Decoded", decoded)
    
    
    return { "uri": "https://discord.com/api/oauth2/authorize?client_id=1199832847012352052&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2F%23%2F&scope=identify"}

@app.get('/users/me')
def get_me():
    return { "uri": "https://discord.com/api/oauth2/authorize?client_id=1199832847012352052&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A9000%2Fauth%2Fdiscord%2Fcallback&scope=identify"}


def SSTEvent(event):
    event['path'] = event['requestContext']['http']['path']
    event['httpMethod'] = event['requestContext']['http']['method']
    return event


def handler(event, context):
    return app.resolve(SSTEvent(event), context)

