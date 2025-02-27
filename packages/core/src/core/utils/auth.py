from urllib.parse import urlencode

import core.utils.config as Config
from pydantic import BaseModel


class DiscordUser(BaseModel):
    id: str
    avatar: str
    username: str
    provider: str = "discord"


class DiscordAdapter:
    def __init__(self, test=False) -> None:
        self.redirect_uri = (
            f"{Config.get_secret('SITE_URL')}/auth/discord/callback"
            if not test
            else "http://localhost:9000"
        )
        pass

    @property
    def authorize_url(self):
        base = "https://discord.com/api/oauth2/authorize"
        params = {
            "client_id": Config.get_secret("DISCORD_OAUTH_CLIENT_ID"),
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": "identify",
        }

        return f"{base}?{urlencode(params)}"

    def tokens(self, code):
        import requests

        params = {
            "client_id": Config.get_secret("DISCORD_OAUTH_CLIENT_ID"),
            "client_secret": Config.get_secret("DISCORD_OAUTH_CLIENT_SECRET"),
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept-Encoding": "application/x-www-form-urlencoded",
        }

        response = requests.post(
            "https://discord.com/api/oauth2/token", data=params, headers=headers
        )

        return response.json()

    def user(self, access_token):
        import requests

        response = requests.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        user_data = response.json()
        return DiscordUser(
            id=user_data["id"],
            avatar=f"https://cdn.discordapp.com/avatars/{user_data['id']}/{user_data['avatar']}",
            username=user_data["global_name"],
        )
