def SSTHTTPEvent(event):
    event['path'] = event['requestContext']['http']['path']
    event['httpMethod'] = event['requestContext']['http']['method']
    return event