DEFAULT_GAME_CONFIG = {
    "tags": [
        # "town_government", 
        # "town_protective", 
        "town_protective", 
        # "town_power", 
        # "town_investigative", 
        # "town_killing", 
        # "town_investigative", 
        # "town_random", 
        # "godfather",
        "mafia_killing",
        # "mafia_killing",
        # "neutral_evil",
        # "neutral_benign",
        # "neutral_random",
        # "any_random"
    ],
    "settings": {
        # TODO: Add durations here
    },
    "roles": {
        "Citizen": {
            "max": 0,
            "weight": 0.01,
            "settings": {
                "maxVests": 2
            }
        },
        # "Mayor": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        # "Doctor": {
        #     "max": 2,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        "Bodyguard": {
            "max": 2,
            "weight": 1,
            "settings": {

            }
        },
        # "Escort": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        # "Sheriff": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        # "Investigator": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        "Mafioso": {
            "max": 2,
            "weight": 1,
            "settings": {
                "promotes": False
            }
        },
        # "Godfather": {
        #     "max": 1,
        #     "weight": 1,
        #     "settings": {
        #         "nightImmune": True
        #     }
        # },
        # "Consort": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        # "Survivor": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {

        #     }
        # },
        # "SerialKiller": {
        #     "max": 0,
        #     "weight": 1,
        #     "settings": {
        #         "nightImmune": True
        #     }
        # }
    }
}