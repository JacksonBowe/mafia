import requests
import jose
from datetime import datetime, timedelta

def main():
    tokens = { 'access_token': '7EwKng7vyq96FVLSyY0lIzkH2jleQU'}
    user_response = requests.get('https://discord.com/api/users/@me', headers={
        "Authorization": f"Bearer {tokens['access_token']}"
    })
    
    discord_user = user_response.json()
    
    expiration_time = datetime.utcnow() + timedelta(days=7)
    claims = {
        'sub': discord_user['id'],
        'display_name': discord_user['global_name'],
        'avatar': discord_user['avatar'],
        'exp': expiration_time
    }
    pass

if __name__=='__main__':
    main()
    
    {'token_type': 'Bearer', 'access_token': '7EwKng7vyq96FVLSyY0lIzkH2jleQU', 'expires_in': 604800, 'refresh_token': 'DYRdIuccXtT2Q8vSZKedwY8uelxnYI', 'scope': 'identify'}
