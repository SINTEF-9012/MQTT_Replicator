# MQTT_Replicator
Multi master replication for all MQTT message brokers.

## Configuration

The configuration 

|Environment variable key|Environment variable value|Description|Example|
|------------------------|--------------------------|-----------|-------|
|`MQTTREP_CLIENT_{name}`|Endpoint url *(required)*|Url of the MQTT message broker. May use mqtt, mqtts, ws, or wss. `{name}` is an identifier that must be unique and shared with the `MQTTREP_CONFIG_{name}` configuration variable.|`mqtt://messagebroker:1883` *or* `wss://messagebroker/`|
|`MQTTREP_CONFIG_{name}`|Configuration object *(optional)*|Configuration of the message broker connection, in the JSON format. See the [MQTT.js documentation](https://github.com/mqttjs/MQTT.js#client) for a description of all possible options. `maxQos` is an aditionnal  parameter which specify the maximum quality of service level supported by the message broker.|`{"username":"root", "password":"hunter2", "maxQos": 1}`|
|`MQTTREP_TOPIC_{id}`|Topic path *(required)*|MQTT topic path. May use `+` and `#` wildcard characters. `{id}` is an identifier that must be unique and shared with the other settings for the topic.|`canards/+`|
|`MQTTREP_RETAIN_{id}`|Boolean *(optional)*|If set to true, all messages on this topic will be retained.|`true` or `false`|
|`MQTTREP_NOSUB_{id}`|Boolean *(optional)*|If set to true, the topic will not be subscribed. It is useful to use specific settings on a more specific path, when a more generic path is already subscribed.|`MQTTREP_TOPIC_A = canards/+`, `MQTTREP_TOPIC_B = canards/name`, `MQTTREP_NOSUB_B = true`, and `MQTTREP_RETAIN_B = true`. Only `canards/name` messages will be retained, and only `canards/+` subscription will be registered to the messages brokers.|

## It supports *almost all* MQTT message brokers

|Message broker|Support|
|--------------|-------|
|ActiveMQ|:white_check_mark:|
|Emitter|:heavy_multiplication_x:|
|EMQTTD|:white_check_mark:|
|HBMQTT|:white_check_mark:|
|HiveMQ|:white_check_mark:|
|Moquette|:white_check_mark:|
|Mosca|:white_check_mark:|
|Mosquitto|:white_check_mark:|
|RabbitMQ|:white_check_mark:|
|VerneMQ|:white_check_mark:|


### Unique Client IDs

If the clientId is not configured in the `MQTTREP_CONFIG_{name}` object, a random clientId is generated. It will use the name and some random values in the format `{name}_{adjective}_{adjective}_{animal}_mqttreplicator_{randomid}`. For example: `brokeroslo_dependable_naughty_amurratsnake_mqttreplicator_HygHEYWObz`.
