# MQTT_Replicator
Multi master replication for all MQTT message brokers.

## Configuration

The configuration 

|Environment variable key|Environment variable value|Description|Example|
|------------------------|--------------------------|-----------|-------|
|`MQTTREP_CLIENT_{name}`|Endpoint url *(required)*|Url of the MQTT message broker. May use mqtt, mqtts, ws, or wss.|`mqtt://messagebroker:1883` *or* `wss://messagebroker/`|
|`MQTTREP_CONFIG_{name}`|Configuration object *(optional)*|Configuration of the message broker connection, in the JSON format. See the [MQTT.js documentation](https://github.com/mqttjs/MQTT.js#client) for a description of all possible options. `maxQos` is an aditionnal  parameter which specify the maximum quality of service level supported by the message broker.|`{"username":"root", "password":"hunter2", "maxQos": 1}`|

## It supports almost *all* MQTT message brokers

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
