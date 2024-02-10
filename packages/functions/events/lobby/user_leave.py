from aws_lambda_powertools.utilities.data_classes import event_source, EventBridgeEvent

@event_source(data_class=EventBridgeEvent)
def handler(event: EventBridgeEvent, context):
    print(event)