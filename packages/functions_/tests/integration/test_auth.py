# def test_discord_authorize(infra, lambda_context):
#     from rest.auth import handler

#     for k,v in os.environ.items():
#         if k.startswith('SST'):
#             print(k, v)

#     event = {
#         "rawPath": "/auth/authorize/discord",
#         "requestContext": {
#             "http": {
#                 "method": "GET",
#             },
#             "stage": "$default",
#         },
#     }

#     response = handler(event, lambda_context)

#     print(response)
