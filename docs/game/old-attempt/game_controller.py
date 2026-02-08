import boto3
import os
import json
import time
import math
from enum import Enum
from typing import List, Tuple

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    InternalServerError,
    NotFoundError
)

from . import UserController
from ..utils import iot
from ..utils.dynamo import build_update_expression
from ..tables.mafia.entities import Lobby, GameActor, Game, User

# This is a MEGA HACK
import sys
sys.path.append('mafia')

import mafia.engine as Mafia

ddb = boto3.resource('dynamodb')
logger = Logger()
	
class Stages(Enum):
    PREGAME = 'PREGAME'
    MORNING = 'MORNING'
    DAY     = 'DAY'
    POLL    = 'POLL'
    DEFENSE = 'DEFENSE'
    TRIAL   = 'TRIAL'
    LYNCH   = 'LYNCH'
    EVENING = 'EVENING'
    NIGHT   = 'NIGHT'

class GameController:
    def __init__(self) -> None:
        self.table = ddb.Table(os.environ['TABLE_NAME'])

    def create_game(self, lobby: Lobby) -> None:
        try:
            players = [{
                "id": player.id,
                "name": player.displayName,
                "alias": player.displayName
            } for player in lobby.players]

            engine_game = Mafia.new_game(players=players, config=json.loads(lobby.config))
            game = Game.from_engine(lobby.id, engine_game)

            # Create the Game db record
            self._ddb_write_game(game)
            # Add the gameId to the user db record
            [self._ddb_update_user_with_game(actor) for actor in game.actors]

            # Add each of the GameActor records to db
            [self._ddb_write_actor(actor) for actor in game.actors]

            # Notify all players of their role
            # TODO: Does this actually do anything?
            [self._iot_notify_actor(actor) for actor in game.actors]

            self._start_primary_state_machine(game.id, 15) # TODO: Add this back, just disabled for testing

        except Mafia.AssConfigException as e:
            logger.error("AssConfigException: Failed to create viable game")
            iot.publish_iot(topic=f'game/{lobby.id}', payload={
                'type': iot.Events.GAME_TERMINATE.value,
                'data': {
                    'error': 'AssConfigException',
                    'message': 'Unable to create a viable game, save was ass'
                }
            })
        except Exception as e:
            # TODO: Unfuck everything that needs unfucking
            logger.error("Failed to create game, it's fucked, time to purge")
            iot.publish_iot(topic=f'game/{lobby.id}', payload={
                'type': iot.Events.GAME_TERMINATE.value,
                'data': None
            })
            raise InternalServerError("Failed to create game, it's fucked, time to purge")

    def _start_primary_state_machine(self, game_id, pregame_duration):
        self.set_stage(game_id, Stages.PREGAME.value, pregame_duration)
        # Start the primary state machine
        client = boto3.client('stepfunctions')
        client.start_execution(
            stateMachineArn=os.environ['CHANGE_STATE_MACHINE_ARN'],
            input=json.dumps({'waitSeconds': pregame_duration, 'gameId': game_id})
        )

    def _iot_notify_actor(self,  actor: GameActor):
        # Update a player with their game actor data
        iot.publish_iot(topic=f"game/{actor.gameId}/actor/{actor.id}", payload={
            'type': iot.Events.GAME_ACTOR.value,
            'data': actor.to_dict()
        })

    def _ddb_write_game(self, game: Game) -> None:
        r = self.table.put_item(
            Item=game.to_ddb()
        )
        if r['ResponseMetadata']['HTTPStatusCode'] != 200:
            logger.error(f"Failed to add game to Dynamo: {game.to_ddb()}")
            raise InternalServerError('Failed to add game to DB')

    def _ddb_write_actor(self, actor: GameActor):
        r = self.table.put_item(
            Item=actor.to_ddb()
        )
        if r['ResponseMetadata']['HTTPStatusCode'] != 200:
            logger.error(f"Failed to write GameActor record: {actor.to_ddb()}")
            raise InternalServerError('Failed to write GameActor record')
        
    def _ddb_remove_actor(self, actor: GameActor) -> None:
        # r = self.table.delete_item(
        #     Key={
        #         'PK': actor.gameId,
        #         'SK': actor.SK
        #     }
        # )
        # TODO
        pass
        
    def _ddb_update_user_with_game(self, actor: GameActor) -> None:
        expr, names, vals = build_update_expression({'game': actor.gameId})
        update = self.table.update_item(
            Key={
                'PK': actor.id,
                'SK': 'A'
            },
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=vals
        )
        if update['ResponseMetadata']['HTTPStatusCode'] != 200:
            logger.error(f"Failed to update user record with game id")
            raise InternalServerError('Failed to update user record with game id')
        
    # def leave_game(self, user_id):
    #     pass

    def user_disconnect(self, user: User) -> None:
        if not user.game: raise BadRequestError('User is not in a game')

        # Remove GameActor record
        delete = self.table.delete_item(
            Key={
                'PK': user.game,
                'SK': f'GAME_ACTOR#{user.id}'
            }
        )
        if delete['ResponseMetadata']['HTTPStatusCode'] != 200:
            logger.error(f"Failed to remove GameActor record")
            raise InternalServerError('Failed to remove GameActor from Game')

        # Remove the game record from the User
        expr, names, vals = build_update_expression({'game': None})
        fields = {}
        if expr: fields['UpdateExpression'] = expr
        if names: fields['ExpressionAttributeNames'] = names
        if vals: fields['ExpressionAttributeValues'] = vals
        update = self.table.update_item(
            Key={
                'PK': user.id,
                'SK': 'A'
            },
            **fields
        )
        if update['ResponseMetadata']['HTTPStatusCode'] != 200:
            logger.error(f"Failed to update user record")
            raise InternalServerError('Failed to update user record')
        
    def _get_game(self, game_id: str, actors: bool=False) -> Game:
        game = self.table.get_item(
            Key={
                'PK': game_id,
                'SK': 'A'
            }
        ).get('Item')

        if not game: raise NotFoundError(f"No game found with id '{game_id}")

        if actors:
            return Game.from_primary(game).with_actors(self._get_game_actors(game_id))
        return Game.from_primary(game)

    def get_game(self, game_id: str) -> dict:
        return self._get_game(game_id).to_dict()
    
    def _get_game_actors(self, game_id: str) -> List[GameActor]:
        game_actors =  self.table.query(
            KeyConditionExpression='PK=:id AND begins_with(SK, :type)',
            ExpressionAttributeValues={
                ':id': game_id,
                ':type': 'GAME_ACTOR#'
            }
        ).get('Items', [])
        return [GameActor.from_primary(user) for user in game_actors]
    
    def _get_game_actor(self, game_id: str, actor_id: str) -> GameActor:
        game_actor = self.table.get_item(
            Key={
                'PK': game_id,
                'SK': f'GAME_ACTOR#{actor_id}'
            }
        ).get('Item')

        if not game_actor: raise NotFoundError(f"No GameActor found with id '{actor_id}'")

        return GameActor.from_primary(game_actor)
    
    def get_actor(self, game_id: str, actor_id: str) -> GameActor:
        return self._get_game_actor(game_id, actor_id).to_dict()
    
    def _update_stage(self, game_id: str, stage: str) -> None:
        update = self.table.update_item(
            Key={
                'PK': game_id,
                'SK': 'A'
            },
            UpdateExpression='set #stage=:stage',
            ExpressionAttributeNames={ '#stage': 'stage' },
            ExpressionAttributeValues={ ':stage': stage }
        )

    def set_stage(self, game_id: str, stage: str, duration: int, stage_label: str=None):
        # Update the dynamo record
        self._update_stage(game_id, stage)
        # Notify all players
        iot.publish_iot(topic=f'game/{game_id}', payload={
            'type': iot.Events.GAME_NEWSTAGE.value,
            'data': {
                'name': stage_label or stage,
                'duration': duration
            }
        })

    def _ddb_write_actor_vote(self, game_id, voter_id: str, target_number: int) -> None:
        update = self.table.update_item(
            Key={
                'PK': game_id,
                'SK': 'GAME_ACTOR#'+voter_id
            },
            UpdateExpression='set #vote=:vote',
            ExpressionAttributeNames={ '#vote': 'vote'},
            ExpressionAttributeValues={ ':vote': target_number}
        )

    def _ddb_delete_actor_vote(self, game_id: str, voter_id: str) -> None:
        delete = self.table.update_item(
            Key={
                'PK': game_id,
                'SK': 'GAME_ACTOR#'+voter_id
            },
            UpdateExpression='remove #vote',
            ExpressionAttributeNames={ '#vote': 'vote'}
        )

    def _iot_notify_vote(self, game_id: str, voter_number: int, target_number: int, action_type: str) -> None:
        iot.publish_iot(topic=f'game/{game_id}',
            payload={
                'type': action_type,
                'data': {
                    'voter': voter_number,
                    'target': target_number
                }
            }
        )

    def vote(self, game_id: str, user_id: str, target_number: int):
        # Players don't have access to the ID's of other players, intentionally

        voter = self._get_game_actor(game_id, user_id)
        # target = self._get_game_actor(game_id, target_id)

        print('Voters current vote', voter.vote)
        print('Target', target_number)

        if voter.vote is None:
            # New Vote
            # Write the vote record to ddb
            self._ddb_write_actor_vote(game_id, voter.id, target_number)

            # Inform all other players that a vote has occured
            self._iot_notify_vote(game_id, voter.number, target_number, iot.Events.GAME_VOTE.value)

        elif voter.vote == target_number:
            # Cancel Vote
            # Remove the vote record from ddb
            self._ddb_delete_actor_vote(game_id, voter.id)

            # Inform all other players that a vote has been canceled
            self._iot_notify_vote(game_id, voter.number, target_number, iot.Events.GAME_VOTE_CANCEL.value)
        
        elif voter.vote != target_number:
            # Change Vote
            # Write the vote record to ddb
            self._ddb_write_actor_vote(game_id, voter.id, target_number)

            # Inform all other players that a vote has occured
            self._iot_notify_vote(game_id, voter.number, target_number, iot.Events.GAME_VOTE.value)

    def _ddb_write_actor_verdict(self, game_id, actor_id: str, verdict: str) -> None:
        update = self.table.update_item(
            Key={
                'PK': game_id,
                'SK': 'GAME_ACTOR#'+actor_id
            },
            UpdateExpression='set #verdict=:verdict',
            ExpressionAttributeNames={ '#verdict': 'verdict'},
            ExpressionAttributeValues={ ':verdict': verdict}
        )

    def _ddb_delete_actor_verdict(self, game_id: str, actor_id: str) -> None:
        remove = self.table.update_item(
            Key={
                'PK': game_id,
                'SK': 'GAME_ACTOR#'+actor_id
            },
            UpdateExpression='remove #verdict',
            ExpressionAttributeNames={ '#verdict': 'verdict'}
        )

    def _iot_notify_vote(self, game_id: str, voter_number: int, target_number: int, action_type: str) -> None:
        iot.publish_iot(topic=f'game/{game_id}',
            payload={
                'type': action_type,
                'data': {
                    'voter': voter_number,
                    'target': target_number
                }
            }
        )

    def verdict(self, game_id: str, user_id: str, verdict: str) -> None:
        actor = self._get_game_actor(game_id, user_id)

        self._set_actor_verdict(actor, verdict)

        # self._iot_notify_verdict(game_id, ) #! TODO

    def _set_actor_verdict(self, actor: GameActor, verdict: str) -> None:
        actor.verdict = verdict

        if verdict is not None:
            self._ddb_write_actor_verdict(actor.gameId, actor.id, verdict)
        else:
            self._ddb_delete_actor_verdict(actor.gameId, actor.id)

    def _ddb_write_actor_targets(self, actor: GameActor, targets: list) -> None:
        update = self.table.update_item(
            Key={
                'PK': actor.gameId,
                'SK': 'GAME_ACTOR#'+actor.id
            },
            UpdateExpression='set #targets=:targets',
            ExpressionAttributeNames={ '#targets': 'targets' },
            ExpressionAttributeValues={ ':targets': json.dumps(targets)}
        )

    # def _ddb_delete_actor_targets(self, actor: GameActor) -> None:
    #     remove = self.table.update_item(
    #         Key={
    #             'PK': actor.gameId,
    #             'SK': 'GAME_ACTOR#'+actor.id
    #         },
    #         UpdateExpression='remove #targets',
    #         ExpressionAttributeNames={ '#targets': 'targets'}
    #     )

    def set_actor_targets(self, actor: GameActor, targets: list) -> None:
        actor.targets = targets
        self._ddb_write_actor_targets(actor, targets)

    def targets(self, game_id: str, user_id: str, targets: List[int]) -> None:
        actor = self._get_game_actor(game_id, user_id)

        self.set_actor_targets(actor, targets)

        

    # def town_hall(self, game_id: str, iteration: int) -> dict:
    #     iteration += 1
    #     print(f'Town Hall - Game {game_id} - Iter {iteration}')
        
    #     voted_target = GameController()._tally_votes(game_id)

    #     if not voted_target:
    #         # If no vote majority, start the next poll
    #         return {
    #             "waitSeconds": 3,
    #             "iteration": iteration,
    #             "continue": iteration < 1,
    #             "gameId": game_id
    #         }
        
    #     # Inform players of vote majority
    #     print(f"Vote majority, player on trial: {voted_target.alias}")

    #     return {
    #         "wait"
    #     }
    # 

    def _ddb_set_actor_alive_status(self, actor: GameActor, alive: bool) -> None:
        update = self.table.update_item(
            Key={
                'PK': actor.gameId,
                'SK': 'GAME_ACTOR#'+actor.id
            },
            UpdateExpression='set #alive=:alive',
            ExpressionAttributeNames={ '#alive': 'on_alive'},
            ExpressionAttributeValues={ ':alive': alive }
        )     

    def _ddb_set_actor_trial_status(self, actor: GameActor, on_trial: bool) -> None:
        update = self.table.update_item(
            Key={
                'PK': actor.gameId,
                'SK': 'GAME_ACTOR#'+actor.id
            },
            UpdateExpression='set #trial=:trial',
            ExpressionAttributeNames={ '#trial': 'on_trial'},
            ExpressionAttributeValues={ ':trial': on_trial }
        )


    def _tally_votes(self, game: Game) -> GameActor:
        print(f'[GAMEID:{game.id}] Tallying votes')
        # game = self._get_game(game_id, actors=True)
        # Create a list of all GameActor votes
        votes = [actor.vote for actor in game.alive_actors if actor.vote]
        print('Votes', votes)
        if not votes: return None
        
        # Find the highest voted target
        voted = next(actor for actor in game.actors if actor.number == max(votes, key=votes.count))
        # Check that target was voted by >50% of lobby
        majority = votes.count(voted.number) >= math.floor(len(game.actors) / 2) #! TODO: Remove the >=, should just be >

        if majority:
            return voted
        
        return None
    
    def _get_verdict(self, game: Game) -> str:
        print(f'[GAMEID:{game.id}] Getting verdict')
        innocent = [actor for actor in game.alive_actors if actor.verdict == 'innocent']
        guilty = [actor for actor in game.alive_actors if actor.verdict == 'guilty']

        print('Verdict')
        print('Innocents', innocent)
        print('Guilty', guilty)
        if len(guilty) > len(innocent): return 'guilty'
        else: return 'innocent'

    def _iot_notify_trial(self, game: Game, actor: GameActor) -> None:
        iot.publish_iot(topic=f'game/{game.id}', payload={
            'type': iot.Events.GAME_TRIAL.value,
            'data': {
                'player': actor.number
            }
        })

    def _iot_notify_trial_over(self, game: Game,) -> None:
        iot.publish_iot(topic=f'game/{game.id}', payload={
            'type': iot.Events.GAME_TRIAL_OVER.value,
            'data': {}
        })

    def _iot_notify_deaths(self, game: Game, deaths: dict) -> None:
        iot.publish_iot(topic=f'game/{game.id}', payload={
            'type': iot.Events.GAME_DEATHS.value,
            'data': deaths
        })

    def _ddb_update_game_state(self, game: Game) -> None:
        update = self.table.update_item(
            Key={
                'PK': game.id,
                'SK': 'A'
            },
            UpdateExpression='set #state=:state',
            ExpressionAttributeNames={ '#state': 'state'},
            ExpressionAttributeValues={ ':state': json.dumps(game.state) }
        )

    def _iot_notify_game_state(self, game: Game) -> None:
        iot.publish_iot(topic=f'game/{game.id}', payload={
            'type': iot.Events.GAME_STATE.value,
            'data': game.state
        })

    def _iot_notify_game_over(self, game: Game, winners: list) -> None:
        iot.publish_iot(topic=f'game/{game.id}', payload={
            'type': iot.Events.GAME_OVER.value,
            'data': winners
        })

    def _ddb_update_game_events(self, game: Game) -> None:
        update = self.table.update_item(
            Key={
                'PK': game.id,
                'SK': 'A'
            },
            UpdateExpression='set #events=:events',
            ExpressionAttributeNames={ '#events': 'events'},
            ExpressionAttributeValues={ ':events': json.dumps(game.events) }
        )

    def _ddb_delete_game_events(self, game: Game) -> None:
        update = self.table.update_item(
            Key={
                'PK': game.id,
                'SK': 'A'
            },
            UpdateExpression='remove #events',
            ExpressionAttributeNames={ '#events': 'events'}
        )


    def change_stage(self, game_id: str, poll_count: int=0):
        print(f'[GAMEID:{game_id}] Changing stage')
        # TODO: Durations should come from config
        duration = 0
        cont = True
        stage_label = None
        game = self._get_game(game_id, actors=True)
        print(f'[GAMEID:{game.id}] Current stage: {game.stage}')
        # Check if the game is over
        # Determing new stage
        if game.stage == Stages.PREGAME.value:
            next_stage, duration, cont = self._process_pregame(game)
        elif game.stage == Stages.MORNING.value:
            next_stage, duration, cont = self._process_morning(game)
        elif game.stage == Stages.DAY.value:
            next_stage, duration, cont = self._process_day(game)
        elif game.stage == Stages.POLL.value:
            poll_count += 1
            next_stage, duration, cont = self._process_poll(game, poll_count)
        elif game.stage == Stages.DEFENSE.value:
            next_stage, duration, cont = self._process_defense(game)
        elif game.stage == Stages.TRIAL.value:
            next_stage, duration, cont = self._process_trial(game, poll_count)
        elif game.stage == Stages.LYNCH.value:
            next_stage, duration, cont = self._process_lynch(game, poll_count)
        elif game.stage == Stages.EVENING.value:
            next_stage, duration, cont = self._process_evening(game)
        elif game.stage == Stages.NIGHT.value:
            next_stage, duration, cont = self._process_night(game)

        if next_stage == 'POLL': 
            stage_label = next_stage + f' - {poll_count+1}'
            print("Removing trial target")
            self._iot_notify_trial_over(game)
        if next_stage == 'EVENING': 
            print("Resetting poll_count")
            poll_count = 0
            print("Removing trial target")
            self._iot_notify_trial_over(game)
        
        
        # cont = False # TODO: TESTING
        if not cont: print(f'[GAMEID:{game.id}] Finishing')
        else: 
            print(f'[GAMEID:{game.id}] Next stage: {next_stage} for {duration}s')
            self.set_stage(game_id, next_stage, duration, stage_label)
        return {
            "gameId": game_id,
            "waitSeconds": duration + 2, # Allow 3 seconds for IoT to push messages and frontend to breath
            "continue": cont,
            "pollCount": poll_count
        }
    
    def _process_pregame(self, game: Game) -> Tuple[str, int, bool]:
        print(f'[GAMEID:{game.id}] Processing PREGAME')
        
        # IoT update all actors
        [self._iot_notify_actor(actor) for actor in game.actors]
        
        # Output
        next_stage = Stages.EVENING.value #! TODO: Should be EVENING
        duration = 10
        cont = True

        return next_stage, duration, cont
    
    def _process_morning(self, game: Game) -> Tuple[int, bool]:
        print(f'[GAMEID:{game.id}] Processing MORNING')
        print(f'[GAMEID:{game.id}] Loading Game')
        
        # Check for win
        mafia_game = Mafia.load_game(
            players=[actor.to_dict() for actor in game.actors],
            state=game.state,
            save=game.config
        )

        print('Finding dead players')
        deaths = [death for death in game.state['graveyard'] if death['deathDay'] == game.state['day']]
        print('Deaths', deaths)

        if deaths:
            self._iot_notify_deaths(game, deaths)

        # IoT send new state
        self._iot_notify_game_state(game)
        
        print(f'[GAMEID:{game.id}] Checking for win')
        winners = mafia_game.check_for_win()
        

        if winners: 
            winners = [{
                'name': winner.player['name'],
                'alias': winner.player['alias'],
                'role': winner.role_name,
            } for winner in winners]

            print(f'[GAMEID:{game.id}] Winners {winners}')
            self._iot_notify_game_over(game, winners)
            cont = False
        else:
            print(f'[GAMEID:{game.id}] No winners')
            cont = True
        
        # Output
        next_stage = Stages.DAY.value
        duration = 10
        # cont = True # Testing

        return next_stage, duration, cont

    def _process_day(self, game: Game):
        print(f'[GAMEID:{game.id}] Processing DAY')
        # Don't really need to do anything here, just give the players time to chat

        # Output
        next_stage = Stages.POLL.value
        duration = 10
        cont = True

        return next_stage, duration, cont 

    def _process_poll(self, game: Game, poll_count):
        print(f'[GAMEID:{game.id}] Processing POLL - Loop {poll_count}')

        # Unset onTrial from suspect #! TODO: This will error if user is no longer in the game
        [self._ddb_set_actor_trial_status(actor, False) for actor in game.actors if actor.on_trial]

        # Unset all 'verdict' from actors
        [self._set_actor_verdict(actor, None) for actor in game.actors]

        # Tally votes
        voted_target = self._tally_votes(game)
        if poll_count > 2:
            return Stages.EVENING.value, 10, True

        if voted_target: 
            print(f'[GAMEID:{game.id}] Vote majority, starting defense')
            self._ddb_set_actor_trial_status(voted_target, True)
            self._iot_notify_trial(game, voted_target)
            return Stages.DEFENSE.value, 10, True
        
        print(f'[GAMEID:{game.id}] No vote majority, looping')
        return Stages.POLL.value, 10, True

    def _process_defense(self, game: Game):
        print(f'[GAMEID:{game.id}] Processing DEFENSE')
        # TODO: Unmute target player
        # Dm't need to do much here, just give the player time to make a defense

        return Stages.TRIAL.value, 10, True

    def _process_trial(self, game: Game, poll_count: int):
        print(f'[GAMEID:{game.id}] Processing TRIAL')
        verdict = self._get_verdict(game)
        if verdict == 'guilty':
            return Stages.LYNCH.value, 10, True
        
        if poll_count >= 2:
            return Stages.EVENING.value, 10, True
        
        return Stages.POLL.value, 10, True
    
    def _process_lynch(self, game: Game, poll_count: int):
        print(f'[GAMEID:{game.id}] Processing LYNCH')
        egame = Mafia.load_game(
            players=[actor.to_engine() for actor in game.actors],
            state=game.state,
            save=game.config
        )
        lynchee = next(actor for actor in game.actors if actor.on_trial)
        print("Lynching player number:", lynchee.number)
        egame.lynch(lynchee.number)

        # Update Lynchee
        lynchee.alive = False
        self._ddb_set_actor_alive_status(lynchee, False)
        self._iot_notify_actor(lynchee)

        # Update all players
        game.state = egame.dump_state()
        self._ddb_update_game_state(game)
        self._iot_notify_game_state(game)
        
        [self._ddb_delete_actor_vote(game.id, actor.id) for actor in game.actors if actor.vote]
        [self._ddb_delete_actor_verdict(game.id, actor.id) for actor in game.actors if actor.verdict]

        if poll_count > 2:
            return Stages.EVENING.value, 10, True
        return Stages.POLL.value, 10, True

    def _process_evening(self, game: Game):
        print(f'[GAMEID:{game.id}] Processing EVENING')
        print([actor.to_engine() for actor in game.actors if actor])
        # TODO: Send to MafiaEngine
        #! TODO: This will probably be fucked if a player leaves the game while alive
        egame = Mafia.load_game(
            players=[actor.to_engine() for actor in game.actors if actor],
            state=game.state,
            save=game.config
        )

        print('ACTORS', egame.state.actors)
        egame.resolve()

        # Update the game state
        game.state = egame.dump_state()
        self._ddb_update_game_state(game)

        # Write the events to the game
        game.events = egame.events.dump()
        print('EVENTS', game.events)
        self._ddb_update_game_events(game)

        print('Game', game.actors)
        print('EGame', egame)
        
        # Update the Actors
        [actor.update_from_engine(
            next(e_actor for e_actor in egame.actors if e_actor['id'] == actor.id)
        ) for actor in game.actors]

        [self._ddb_write_actor(actor) for actor in game.actors]

        # Output
        next_stage = Stages.NIGHT.value
        duration = egame.events.duration
        cont = True
        
        return next_stage, duration, cont

    def _process_night(self, game: Game):
        print(f'[GAMEID:{game.id}] Processing NIGHT')

        print('GAME', game)
        if game.events:
            for action_event in game.events:
                for event_group in action_event.get('events', []):
                    for event in event_group.get('events', []):
                        for target in event['targets']:
                            iot.publish_iot(
                                topic=f'game/{game.id}' if target == '*' else f'game/{game.id}/actor/{target}',
                                payload={
                                    'type': iot.Events.GAME_EVENT.value,
                                    'data': {
                                        'event_id': event['event_id'],
                                        'message': event['message']
                                    }
                                }
                            )
                    if event.get('duration', 0) > 0:
                        time.sleep(event_group['duration']) # I don't love this, may need to investigate a better method. Maybe SQS?
                        print('Awokened')
        
        # IoT update all actors
        [self._iot_notify_actor(actor) for actor in game.actors]
        
        # IoT update game state
        self._iot_notify_game_state(game)

        # Remove all player targets in prep for next night
        [self._ddb_write_actor_targets(actor, []) for actor in game.actors]

        # Remove events from game
        self._ddb_delete_game_events(game)

        
        # Output
        next_stage = Stages.MORNING.value
        duration = 10
        cont = True
        
        return next_stage, duration, cont
