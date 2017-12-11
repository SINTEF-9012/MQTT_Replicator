# MQTT_Replicator
Multi master replication for all MQTT message brokers, using the MQTT protocol.

![](https://user-images.githubusercontent.com/45740/33769467-ff0e2174-dc32-11e7-9aca-a013d6aceb4d.png)

## Eventual consistency or optimistic replication

The system may converge to a consistent dataset, but does not provide any guarantie to do so.

## Reconciliation

The default *(and currently only available)* reconciliation algorithm is *last writer wins*.

Potential algorithms:

 * Last writer wins (network latency or network issues may trigger inconsistent states).
 * Having a timestamps in the messages (requires clock synchronization).
 * Having a serial number in the messages (may have collisions).
 * A combinaison of all of these.

From a publisher point of view, publishing the message at a specific interval, even when its content has not changed, is a good and simple solution to have a high probability to have it replicated correctly.

It is also advised to have only one publisher per topic.

## TTls and deleted messages

Replicating deleted messages in a light and simple fashion is possible using different approaches :

**Nothing specific**: Very simple solution but in some cases, a deleted message may appear again because the system forgot it was deleted.

**À la CouchDB**: The clients does not delete the messages, but update them with a specific content saying that they have been deleted. `{"_deleted":true}` for example. The clients should then filter incomming messages to ignore the deleted ones. This may not work when messages using differents topics are often deleted.

**Messages have a life time**: Messages are always automatically deleted when their topic has been inactive for a specific amount of time. All deleted messages will be eventually deleted. However, messages which should not be deleted must be published again by the clients. This feature may be enabled only on specific topics patterns.

## Configuration

MQTT Replicator may be configured using variable environments.

|Environment variable key|Environment variable value|Description|Example|
|------------------------|--------------------------|-----------|-------|
|`MQTTREP_CLIENT_{name}`|Endpoint url *(required)*|Url of the MQTT message broker. May use mqtt, mqtts, ws, or wss. `{name}` is an identifier that must be unique and shared with the `MQTTREP_CONFIG_{name}` configuration variable.|`mqtt://messagebroker:1883` *or* `wss://messagebroker/`|
|`MQTTREP_CONFIG_{name}`|Configuration object *(optional)*|Configuration of the message broker connection, in the JSON format. See the [MQTT.js documentation](https://github.com/mqttjs/MQTT.js#client) for a description of all possible options. `maxQos` is an aditionnal  parameter which specify the maximum quality of service level supported by the message broker.|`{"username":"root", "password":"hunter2", "maxQos": 1}`|
|`MQTTREP_TOPIC_{id}`|Topic path *(required)*|MQTT topic path. May use `+` and `#` wildcard characters. `{id}` is an identifier that must be unique and shared with the other settings for the topic.|`canards/+`|
|`MQTTREP_TTL_{id}`|Number in seconds *(optional, default to 0 as infinity)*|If set to a number, time before a message on its topic is automatically erased by publishing an empty message on the same topic.|`1200`|
|`MQTTREP_RETAIN_{id}`|Boolean *(optional)*|If set to true, all messages on this topic will be retained.|`true` or `false`|
|`MQTTREP_QOS_{id}`|`0`, `1`, or `2` *(optional, default to `1`)*|Quality of service.|`2`|
|`MQTTREP_NOSUB_{id}`|Boolean *(optional)*|If set to true, the topic will not be subscribed. It is useful to use specific settings on a more specific path, when a more generic path is already subscribed.|`MQTTREP_TOPIC_A = canards/+`, `MQTTREP_TOPIC_B = canards/name`, `MQTTREP_NOSUB_B = true`, and `MQTTREP_RETAIN_B = true`. Only `canards/name` messages will be retained, and only `canards/+` subscription will be registered to the messages brokers.|
|`MQTTREP_SUBSCRIBE_WHITELIST_{id}`|Comma seperated list of `{name}` message brokers. *(optional)*|Only the message brokers in the list will subscribe to the topic associated to `{id}`.|`MQTTREP_SUBSCRIBE_WHITELIST_B = BROKEROSLO,BROKERPARIS`|
|`MQTTREP_SUBSCRIBE_BLACKLIST_{id}`|Comma seperated list of `{name}` message brokers. *(optional)*|The message brokers in the list will not subscribe to the topic associated to `{id}`.|`MQTTREP_SUBSCRIBE_BLACKLIST_B = BROKERQUEBEC`|
|`MQTTREP_PUBLISH_WHITELIST_{id}`|Comma seperated list of `{name}` message brokers. *(optional)*|Only the message brokers in the list may publish to the topic associated to `{id}`, or will use its QoS and retain settings.|`MQTTREP_PUBLISH_WHITELIST_B = BROKEROSLO,BROKERPARIS`|
|`MQTTREP_PULISH_BLACKLIST_{id}`|Comma seperated list of `{name}` message brokers. *(optional)*|The message brokers in the list cannot publish to the topic associated to `{id}`, and will not its QoS and retain settings.|`MQTTREP_SUBSCRIBE_BLACKLIST_B = BROKERQUEBEC`|
|`MQTTREP_MERGE_FREQUENCY`|Frequency in Hz (float). *(optional, default to `1`)*|The frequency at which the replication is trigerred. Too high frequencies may trigger unecessary synchronizations due to networks latencies.|`16.666`|


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

### Acknowledgements

This library is developed in context of the [ANYWHERE](http://anywhere-h2020.eu/) project.
