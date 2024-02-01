from core.utils import Config
import core.tables.Users as UsersTable


def update_discord_user(user):
    UsersTable.update_item(
        pk=user['id'],
        sk='A',
        attributes={
            'avatar': f"https://cdn.discordapp.com/avatars/{Config.get_secret('DISCORD_OAUTH_CLIENT_ID')}/{user['avatar']}",
            'username': user['global_name']
        }
    )
    
# def create_user(user)
    
    
def get_user_by_id(id: str) -> UsersTable.entities.User:
    UsersTable.get_item()